const { syncUserEmails } = require("../services/sync.service");

exports.syncEmails = async (req, res, next) => {
  try {
    const data = await syncUserEmails();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};