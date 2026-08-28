import Game from "../models/Game.js";
import MoodPreference from "../models/MoodPreference.js";

const getOrCreatePreference = async (userId) => {
  let pref = await MoodPreference.findOne({ user: userId });

  if (!pref) {
    pref = await MoodPreference.create({
      user: userId,
      likes: { genres: {}, tags: {} },
      dislikes: { genres: {}, tags: {} },
      played: [],
      notForMeGames: [],
      moodHistory: [],
    });
  }

  return pref;
};

const bumpMap = (map, key, amount) => {
  const current = map.get(key) || 0;
  const next = current + amount;

  if (Math.abs(next) < 0.001) {
    map.delete(key);
  } else {
    map.set(key, next);
  }
};

export const getMyMoodPreference = async (req, res) => {
  try {
    const pref = await getOrCreatePreference(req.user.id);

    return res.status(200).json(pref);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load mood preference",
      error: error.message,
    });
  }
};

export const rateMoodGame = async (req, res) => {
  try {
    const { gameId, action } = req.body;

    if (!gameId || !action) {
      return res.status(400).json({ message: "Game ID and action are required" });
    }

    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    const pref = await getOrCreatePreference(req.user.id);

    if (action === "love") {
      bumpMap(pref.likes.genres, game.genre, 1.2);

      game.tags.forEach((tag) => {
        bumpMap(pref.likes.tags, tag, 0.8);
      });

      pref.notForMeGames = pref.notForMeGames.filter(
        (id) => String(id) !== String(game._id)
      );
    }

    if (action === "nope") {
      bumpMap(pref.dislikes.genres, game.genre, 1);

      game.tags.forEach((tag) => {
        bumpMap(pref.dislikes.tags, tag, 0.8);
      });

      if (!pref.notForMeGames.some((id) => String(id) === String(game._id))) {
        pref.notForMeGames.push(game._id);
      }
    }

    if (action === "played") {
      const alreadyPlayed = pref.played.some(
        (item) => String(item.game) === String(game._id)
      );

      if (!alreadyPlayed) {
        pref.played.push({
          game: game._id,
          playedAt: new Date(),
        });
      }
    }

    await pref.save();

    return res.status(200).json({
      message: "Mood AI memory updated",
      preference: pref,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update mood memory",
      error: error.message,
    });
  }
};

export const saveMoodHistory = async (req, res) => {
  try {
    const { arch, mood, pref } = req.body;

    const moodPref = await getOrCreatePreference(req.user.id);

    moodPref.moodHistory.unshift({
      arch: arch || "custom",
      mood: mood || {},
      pref: pref || {},
      createdAt: new Date(),
    });

    moodPref.moodHistory = moodPref.moodHistory.slice(0, 10);

    await moodPref.save();

    return res.status(200).json({
      message: "Mood history saved",
      moodHistory: moodPref.moodHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to save mood history",
      error: error.message,
    });
  }
};

export const resetMoodPreference = async (req, res) => {
  try {
    await MoodPreference.findOneAndDelete({ user: req.user.id });

    return res.status(200).json({
      message: "Mood AI memory reset",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to reset mood memory",
      error: error.message,
    });
  }
};
