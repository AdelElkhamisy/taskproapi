const router = require('express').Router();
const Language = require('../../models/languages');
const { dashboardRoutes, projectRoutes, homeDashboardPage, homeProjectPage, popUps, settingsPage, projects_dashboard_page } = require('../../models/translations');
const auth = require('../auth');

const getTranslationsByCollection = async (collectionName) => {
    switch (collectionName) {
        case 'home_dashboard_pages':
            return await homeDashboardPage.find({});
        case 'home_project_pages':
            return await homeProjectPage.find({});
        case 'settings_pages':
            return await settingsPage.find({});
        case 'dashboard_routes':
            return await dashboardRoutes.find({});
        case 'projrct_routes':
            return await projectRoutes.find({});
        case 'popups':
            return await popUps.find({});
        case 'projects_dashboard_pages':
            return await projects_dashboard_page.find({});
        default:
            throw new Error('Invalid collection name');
    }
};

const getAllTranslations = async (req, res, next) => {
    try {
        const collections = [
            'home_dashboard_pages',
            'home_project_pages',
            'settings_pages',
            'dashboard_routes',
            'projrct_routes',
            'popups',
            'projects_dashboard_pages',
        ];

        const translations = {};

        for (const collection of collections) {
            const data = await getTranslationsByCollection(collection);
            translations[`${collection}`] = data;
        }

        res.status(200).json(translations);
    } catch (e) {
        res.status(404).json({ status: 0, message: e.message });
    }
};

const updateTranslationByCollection = async (collectionName, id, langCode, newWord) => {
    let updateQuery = { $set: {} };
    updateQuery.$set[`translations.${langCode}`] = newWord;

    switch (collectionName) {
        case 'home_dashboard_pages':
            return await homeDashboardPage.findByIdAndUpdate({ _id: id }, updateQuery);
        case 'home_project_pages':
            return await homeProjectPage.findByIdAndUpdate({ _id: id }, updateQuery);
        case 'settings_pages':
            return await settingsPage.findByIdAndUpdate({ _id: id }, updateQuery);
        case 'dashboard_routes':
            return await dashboardRoutes.findByIdAndUpdate({ _id: id }, updateQuery);
        case 'projrct_routes':
            return await projectRoutes.findByIdAndUpdate({ _id: id }, updateQuery);
        case 'popups':
            return await popUps.findByIdAndUpdate({ _id: id }, updateQuery);
        case 'projects_dashboard_pages':
            return await projects_dashboard_page.findByIdAndUpdate({ _id: id }, updateQuery);
        default:
            throw new Error('Invalid collection name');
    }
};

const updateTranslation = async (req, res, next) => {
    try {
        const { collection_name, id, lang_code, new_word } = req.body;

        await updateTranslationByCollection(collection_name, id, lang_code, new_word);

        res.status(200).json({ message: 'Success' });
    } catch (e) {
        res.status(404).json({ status: 0, message: e.message });
    }
};




router.get("/getAll", getAllTranslations);
router.put("/update", updateTranslation);



module.exports = router;
