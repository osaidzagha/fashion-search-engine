// src/controllers/watchlistController.ts
import { Response } from "express";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";
import { priceAlertQueue } from "../queues/queues";
import { AuthRequest } from "../middlewares/authMiddleware";

// GET /api/watchlist
export const getWatchlist = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const user = await UserModel.findById(req.user!._id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.watchlist || user.watchlist.length === 0) {
      return res.status(200).json([]);
    }

    const productIds = user.watchlist.map((item) => item.productId);
    const products = await ProductModel.find({
      id: { $in: productIds },
    }).lean();

    const productsWithTrackedPrices = products.map((product) => {
      const userTrackData = user.watchlist.find(
        (item) => item.productId === product.id,
      );
      return {
        ...product,
        trackedPrice: userTrackData?.trackedPrice || product.price,
      };
    });

    return res.status(200).json(productsWithTrackedPrices);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/watchlist/:productId
export const addToWatchlist = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const productId = req.params["productId"] as string;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required." });
    }

    const userId = req.user!._id;

    const product = await ProductModel.findOne({ id: productId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const updated = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        "watchlist.productId": { $ne: productId },
      },
      {
        $push: {
          watchlist: {
            productId,
            trackedPrice: product.price,
            addedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      return res.status(200).json({ message: "Already tracking this product" });
    }

    return res.status(200).json({ message: "Added to watchlist", productId });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/watchlist/:productId
export const removeFromWatchlist = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const productId = req.params["productId"] as string;
    const userId = req.user!._id;

    await UserModel.findByIdAndUpdate(userId, {
      $pull: { watchlist: { productId } },
    });

    return res
      .status(200)
      .json({ message: "Removed from watchlist", productId });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const notifyWatchlistUsers = async (
  productId: string,
  productName: string,
  productLink: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
  brandName: string,
  runId: string,
): Promise<void> => {
  try {
    const users = await UserModel.find({
      "watchlist.productId": productId,
    }).lean();

    if (users.length === 0) return;

    console.log(
      `📧 Prepping price drop alerts for ${users.length} users on ${productName}`,
    );

    const jobs = users.map((user) => ({
      name: "price-alert",
      data: {
        email: user.email,
        productName,
        productLink,
        oldPrice,
        newPrice,
        currency,
        brandName,
        runId,
      },
    }));

    const BATCH_SIZE = 1000;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      await priceAlertQueue.addBulk(batch);
      console.log(`✅ Queued batch of ${batch.length} emails...`);
    }
  } catch (error) {
    console.error("Error queueing watchlist notifications:", error);
  }
};
