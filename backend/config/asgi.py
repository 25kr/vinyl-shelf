import os
from django.core.asgi import get_asgi_application

# Public hosting must supply environment secrets and appropriate settings.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")
application = get_asgi_application()
