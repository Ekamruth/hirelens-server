const Application = require("../models/application.model");

exports.getApplications = async (req, res, next) => {
  try {
    const { status, company } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (company) filter.company = company;

    const applications = await Application.find(filter).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};