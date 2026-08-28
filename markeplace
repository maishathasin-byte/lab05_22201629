import MarketplaceInventory from "../models/MarketplaceInventory.js";
import MarketplaceListing from "../models/MarketplaceListing.js";
import MarketplaceTransaction from "../models/MarketplaceTransaction.js";
import User from "../models/User.js";

const seedInventory = async (userId) => {
  const count = await MarketplaceInventory.countDocuments({ owner: userId });

  if (count > 0) return;

  await MarketplaceInventory.insertMany([
    {
      owner: userId,
      type: "game",
      platform: "Steam",
      title: "Elden Ring",
      condition: "used",
      tags: ["souls", "rpg"],
      note: "Region: Global",
    },
    {
      owner: userId,
      type: "game",
      platform: "PC",
      title: "Cyberpunk 2077",
      condition: "gift",
      tags: ["action", "story"],
      note: "Giftable key",
    },
    {
      owner: userId,
      type: "skin",
      platform: "PC",
      title: "AK-47 Neon Rider",
      condition: "new",
      tags: ["rare", "cosmetic"],
      note: "Float: 0.12",
    },
  ]);
};

export const getMarketplaceSummary = async (req, res) => {
  try {
    await seedInventory(req.user.id);

    const user = await User.findById(req.user.id).select("wallet username");
    const inventoryCount = await MarketplaceInventory.countDocuments({
      owner: req.user.id,
    });
    const activeCount = await MarketplaceListing.countDocuments({
      seller: req.user.id,
      status: "active",
    });

    res.json({
      wallet: user.wallet ?? 120,
      inventoryCount,
      activeCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load marketplace summary" });
  }
};

export const getListings = async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ status: "active" }).sort({
      createdAt: -1,
    });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Failed to load listings" });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({
      seller: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Failed to load my listings" });
  }
};

export const getInventory = async (req, res) => {
  try {
    await seedInventory(req.user.id);

    const inventory = await MarketplaceInventory.find({
      owner: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Failed to load inventory" });
  }
};

export const createListing = async (req, res) => {
  try {
    const { type, platform, title, price, condition, tags, description } = req.body;

    if (!title || !price || Number(price) <= 0) {
      return res.status(400).json({ message: "Title and valid price are required" });
    }

    const listing = await MarketplaceListing.create({
      seller: req.user.id,
      sellerName: req.user.username,
      type,
      platform,
      title,
      price: Number(price),
      condition,
      tags: Array.isArray(tags) ? tags : [],
      description,
      status: "active",
    });

    res.status(201).json({
      message: "Listing created",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create listing" });
  }
};

export const buyListing = async (req, res) => {
  try {
    const { listingId } = req.body;

    const listing = await MarketplaceListing.findById(listingId);

    if (!listing || listing.status !== "active") {
      return res.status(404).json({ message: "Listing not available" });
    }

    if (String(listing.seller) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot buy your own listing" });
    }

    const buyer = await User.findById(req.user.id);
    const seller = await User.findById(listing.seller);

    if (buyer.wallet < listing.price) {
      return res.status(400).json({ message: "Not enough wallet balance" });
    }

    buyer.wallet = +(buyer.wallet - listing.price).toFixed(2);
    seller.wallet = +((seller.wallet || 120) + listing.price).toFixed(2);

    listing.status = "sold";
    listing.buyer = buyer._id;
    listing.buyerName = buyer.username;

    await buyer.save();
    await seller.save();
    await listing.save();

    await MarketplaceInventory.create({
      owner: buyer._id,
      type: listing.type,
      platform: listing.platform,
      title: listing.title,
      condition: "used",
      tags: listing.tags,
      note: `Purchased from ${listing.sellerName}`,
    });

    await MarketplaceTransaction.create({
      user: buyer._id,
      kind: "Purchase",
      title: listing.title,
      amount: -listing.price,
      note: `Bought from ${listing.sellerName}`,
    });

    await MarketplaceTransaction.create({
      user: seller._id,
      kind: "Sale",
      title: listing.title,
      amount: listing.price,
      note: `Sold to ${buyer.username}`,
    });

    res.json({ message: "Purchase successful" });
  } catch (error) {
    res.status(500).json({ message: "Failed to buy listing" });
  }
};

export const sendOffer = async (req, res) => {
  try {
    const { listingId, price, message } = req.body;

    const listing = await MarketplaceListing.findById(listingId);

    if (!listing || listing.status !== "active") {
      return res.status(404).json({ message: "Listing not available" });
    }

    listing.offers.unshift({
      buyer: req.user.id,
      buyerName: req.user.username,
      price: Number(price),
      message,
    });

    await listing.save();

    res.json({ message: "Offer sent", listing });
  } catch (error) {
    res.status(500).json({ message: "Failed to send offer" });
  }
};

export const delistListing = async (req, res) => {
  try {
    const { listingId } = req.body;

    const listing = await MarketplaceListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (String(listing.seller) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    listing.status = "delisted";
    await listing.save();

    res.json({ message: "Listing delisted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delist listing" });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const tx = await MarketplaceTransaction.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(tx);
  } catch (error) {
    res.status(500).json({ message: "Failed to load transactions" });
  }
};
