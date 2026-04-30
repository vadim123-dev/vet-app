from datetime import timedelta
import os

class Config:
    API_DOGS_DATA = "https://api.thedogapi.com/v1/breeds"
    API_CATS_DATA = "https://api.thecatapi.com/v1/breeds"

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=14)

    DEBUG = False