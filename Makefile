# Makefile for releasing chili

NAME:=chili
DOCKER_REPOSITORY:=mpellon
DOCKER_IMAGE_NAME:=$(DOCKER_REPOSITORY)/$(NAME)
VERSION:=$(shell grep 'VERSION' version.js | awk '{ print $$4 }' | tr -d '"')

build-container:
	docker build -t $(DOCKER_IMAGE_NAME):$(VERSION) .

test-container:
	@docker rm -f chili || true
	@docker run -dp 8080:8080 --name=chili $(DOCKER_IMAGE_NAME):$(VERSION)
	@docker ps
	curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8080/healthz