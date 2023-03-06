# chili

Chili is a tiny web application made with Node.js that showcases best 
practices of running microservices in Kubernetes.

### Specifications

- Health checks (readiness and liveness)
- Graceful shutdown on interrupt signals
- Swagger docs

### API

- `GET /` prints runtime information
- `GET /healthz` used by Kubernetes liveness probe

## Install

To install Chili on Kubernetes the minimum required version is *Kubernetes v1.23*.