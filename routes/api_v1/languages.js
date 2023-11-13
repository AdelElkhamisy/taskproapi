const router = require('express').Router();
const Language = require('../../models/languages');
const auth = require('../auth');

const getAllLanguages = async (req, res, next) => {
    try {
        const language = await Language.find();
        res.status(200).json(language);
    } catch (e) {
        res.status(404).json({ status: 0, message: "Not Found" });
    }
};

const updateLanguage = async (req, res, next) => {
    try {
        const language = await Language.findByIdAndUpdate({ _id: req?.body?.id }, { $set: { active: req?.body?.active } });
        res.status(200).json({ status: 1, message: "Updated" });
    } catch (e) {
        res.status(404).json({ status: 0, message: "Language Not Found" });
    }
};

const getActive = async (req, res, next) => {
    try {
        const language = await Language.find({  active: true });
        res.status(200).json(language);
    } catch (e) {
        res.status(404).json({ status: 0, message: "Not Found" });
    }
};

router.get("/getAll", getAllLanguages);
router.put("/update", updateLanguage);
router.get("/getActive", getActive);


module.exports = router;
