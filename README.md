# Setup

To launch the Python server:

```
cd simulator
docker build . -t pylabrobot_env
poetry install
SIMULATOR_DOCKER_IMAGE=pylabrobot_env poetry run python app.py
```

To launch the webapp:

```
cd auto-pylabrobot
yarn add next
yarn build
yarn start
```
