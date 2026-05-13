import { Response } from "express";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";
import { priceAlertQueue } from "../queues/queues";
import { AuthRequest } from "../middlewares/authMiddleware"; // 👈 1. IMPORT YOUR CUSTOM TYPE

// GET /api/watchlist
export const getWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    // 👈 2. USE req.user! (The exclamation mark tells TS "I know this exists because the auth middleware checked it")
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
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/watchlist/:productId
export const addToWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    if (Array.isArray(productId)) {
      return res
        .status(400)
        .json({ message: "Only one product ID is allowed." });
    }

    const userId = req.user!._id; // 👈 3. USE req.user!

    const product = await ProductModel.findOne({ id: productId });
    // This return guarantees product is not null for the rest of the function!
    if (!product) return res.status(404).json({ message: "Product not found" });

    // The atomic update (This is the best way to do this!)
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

    // 👈 4. THE DEAD CODE IS GONE! Just return the success response.
    return res.status(200).json({ message: "Added to watchlist", productId });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/watchlist/:productId
export const removeFromWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user!._id; // 👈 5. USE req.user!

    await UserModel.findByIdAndUpdate(userId, {
      $pull: { watchlist: { productId } },
    });

    return res
      .status(200)
      .json({ message: "Removed from watchlist", productId });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const notifyWatchlistUsers = async (
  productId: string,
  productName: string,
  productLink: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
  brandName: string, // <-- Passed this in to satisfy TS
  runId: string, // <-- Passed this in to satisfy TS
): Promise<void> => {
  try {
    const users = await UserModel.find({
      "watchlist.productId": productId,
    }).lean();

    if (users.length === 0) return;

    console.log(
      `📧 Prepping price drop alerts for ${users.length} users on ${productName}`,
    );

    // 1. Map the users into the exact format BullMQ expects for a Bulk insert
    const jobs = users.map((user) => ({
      name: "price-alert", // The name of the job
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

    // 2. We chunk the array into batches of 1,000 to be perfectly safe on memory
    const BATCH_SIZE = 1000;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);

      // 3. Send 1,000 jobs to Redis in a single network operation!
      await priceAlertQueue.addBulk(batch);

      console.log(`✅ Queued batch of ${batch.length} emails...`);
    }
  } catch (error) {
    console.error("Error queueing watchlist notifications:", error);
  }
};
