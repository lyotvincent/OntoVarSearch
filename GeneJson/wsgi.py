"""
WSGI config for GeneJson project.

It exposes the WSGI callable as a plugins-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/2.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "GeneJson.settings")

application = get_wsgi_application()
