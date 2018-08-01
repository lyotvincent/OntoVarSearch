"""
WSGI config for GeneJson project.

It exposes the WSGI callable as a plugins-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/2.0/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

#服务器使用,虚拟环境设置
sys.path.append('C:/Project/vcf2json')
sys.path.append('C:/Project/vcf2json/venv/Lib/site-packages')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "GeneJson.settings")

application = get_wsgi_application()
