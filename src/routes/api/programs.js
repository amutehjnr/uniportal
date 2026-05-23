'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/universityController');
router.get('/', ctrl.listPrograms);
module.exports = router;
