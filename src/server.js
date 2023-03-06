/**
 * server.js: The main entrypoint to the application.
 *
 * (C) 2023 Michelle Pellon
 * MIT LICENCE
 */

'use strict';

// Standard library dependencies
const http = require('http');
var path = require('path');
var os = require("os");

// Third-party dependencies
require("dotenv").config({ path: ".env" });
const express = require("express");
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createTerminus } = require('@godaddy/terminus');
const { Sequelize } = require('sequelize');
const serveStatic = require('serve-static')

// Internal dependencies
const morganMiddleware = require("./middlewares/morgan.middleware");
const logger = require("./utils/logger");

const dbConnection = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  dialect: 'mysql',
  host: process.env.DB_HOST,
  pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
  }
});

// Constants
const PORT = process.env.NODE_DOCKER_PORT;

const app = express();
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(morganMiddleware);

app.use(serveStatic(path.join(__dirname, 'public'), { index: ['index.html'] }));

app.get("/api/info", (req, res) => {
  res.status(200).send({
    hostname: os.hostname(),
    version: "0.1.0",
    color: process.env.UI_COLOR,
    logo: process.env.UI_LOGO,
    runtime: process.version,
    revision: "unknown",
    message: process.env.UI_MESSAGE,
  });
});

// Configure API documentation
const apiDocOpts = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chili API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:8080/api-docs/",
      }
    ],
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(apiDocOpts);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

function onHealthCheck ({ state }) {
  try {
    dbConnection.authenticate();
    logger.info('DB Connected');
    return Promise.resolve()
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
    return Promise.reject(new Error('Sequelize has disconnected.'));
  }
}

function isReadyCheck ({ state }) {
  return new Promise(resolve => {
    resolve()
  })
}

function onSignal () {
  logger.info('server is starting cleanup')

  return new Promise((resolve, reject) => {
    dbConnection.connectionManager.close()
      .then(() => {
        logger.info('Sequelize has disconnected.')
        resolve()
      })
      .catch(reject)
  })
}

function beforeShutdown () {
  // Avoid race conditions with readiness probes
  return new Promise(resolve => {
    setTimeout(resolve, 5000)
  })
}

async function startServer () {
  createTerminus(http.createServer(app), {
    logger: logger,
    signal: 'SIGINT',
    healthChecks: {
      '/healthz': onHealthCheck,
      '/readyz': isReadyCheck,
    },

    onSignal,
    beforeShutdown,
    useExit0: true
  }).listen(PORT || 8080)
}

startServer()
  .catch(err => logger.error('Connection error', err.stack))