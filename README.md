# Setup

To launch the Python server:

```
cd simulator
docker build . -t pylabrobot_env
SIMULATOR_DOCKER_IMAGE=pylabrobot_env poetry run python app.py
```

To launch the webapp:

```
cd auto-pylabrobot
yarn build
yarn start
```