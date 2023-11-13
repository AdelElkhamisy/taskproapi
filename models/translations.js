const mongoose = require("mongoose");

const NewSchema = new mongoose.Schema({
    translations: Object
});


const homeDashboardPage = mongoose.model('home_dashboard_pages', NewSchema);
const projects_dashboard_page = mongoose.model('projects_dashboard_pages', NewSchema);
const homeProjectPage = mongoose.model('home_project_pages', NewSchema);
const dashboardRoutes = mongoose.model('dashboard_routes', NewSchema);
const projectRoutes = mongoose.model('projrct_routes', NewSchema);
const settingsPage = mongoose.model('settings_pages', NewSchema);
const popUps = mongoose.model('popups', NewSchema);

module.exports = { dashboardRoutes, projectRoutes, homeDashboardPage, homeProjectPage, settingsPage, popUps, projects_dashboard_page }