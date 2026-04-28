import { Request, Response } from "express";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";

// GET /api/watchlist
// Returns all products the logged-in user is tracking PLUS their custom trackedPrice
export const getWatchlist = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById((req as any).user._id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.watchlist || user.watchlist.length === 0) {
      return res.status(200).json([]);
    }

    const productIds = user.watchlist.map((item) => item.productId);
    const products = await ProductModel.find({
      id: { $in: productIds },
    }).lean();

    // 👇 THE MERGE: We combine the global product data with the user's specific tracked price
    const productsWithTrackedPrices = products.map((product) => {
      // Find this specific product in the user's watchlist array
      const userTrackData = user.watchlist.find(
        (item) => item.productId === product.id,
      );

      return {
        ...product,
        trackedPrice: userTrackData?.trackedPrice || product.price, // Fallback safely
      };
    });

    return res.status(200).json(productsWithTrackedPrices);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/watchlist/:productId
// Add a product to the logged-in user's watchlist
export const addToWatchlist = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if (Array.isArray(productId)) {
      return res
        .status(400)
        .json({ message: "Only one product ID is allowed." });
    }
    const userId = (req as any).user._id;

    // Check product exists AND get its current price
    const product = await ProductModel.findOne({ id: productId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent duplicates
    const alreadyTracking = user.watchlist.some(
      (item) => item.productId === productId,
    );
    if (alreadyTracking) {
      return res.status(200).json({ message: "Already tracking this product" });
    }

    // 👇 CAPTURE THE EVENT STATE: Save the price at this exact second
    user.watchlist.push({
      productId,
      trackedPrice: product.price,
      addedAt: new Date(),
    });

    await user.save();

    return res.status(200).json({ message: "Added to watchlist", productId });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/watchlist/:productId
// Remove a product from the logged-in user's watchlist
export const removeFromWatchlist = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = (req as any).user._id;

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

// ✅ Called by the scraper pipeline after saving a product with a new lower price.
// Finds all users watching this product and sends them a price drop email.
export const notifyWatchlistUsers = async (
  productId: string,
  productName: string,
  productLink: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
): Promise<void> => {
  try {
    const { sendPriceAlertEmail } = await import("../utils/sendEmail");

    // Find all users who have this product in their watchlist
    const users = await UserModel.find({
      "watchlist.productId": productId,
    }).lean();

    if (users.length === 0) return;

    console.log(
      `📧 Notifying ${users.length} user(s) about price drop on ${productName}`,
    );

    for (const user of users) {
      await sendPriceAlertEmail(
        user.email,
        productName,
        productLink,
        oldPrice,
        newPrice,
        currency,
      );
    }
  } catch (error) {
    console.error("Error notifying watchlist users:", error);
    // Don't throw — price alerts failing should never break the scraper
  }
};
