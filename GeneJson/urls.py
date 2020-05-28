"""GeneJson URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from mysite import views



urlpatterns = [
    path('admin/', admin.site.urls),
    path('index', views.html_index),
    # path('upload', views.html_upload),
    # path('about', views.html_about),
    # path('browse', views.html_browse),
    path('contact', views.html_contact),
    path('download', views.html_download),
    path('upload/doupload', views.doupload),
    path('upload/uploadcomplete', views.uploadcomplete),
    path('upload/uploadcheckchunk', views.uploadcheckchunk),
    path('upload/uploadcheckfile', views.uploadcheckfile),
    path('upload/convert', views.uploadconvert),
    path('upload/importDB', views.uploadimportDB),
    path('search', views.html_search),
    path('search/doDiseaseSearch', views.DiseaseSearch),
    path('search/doVCFSearch/', views.doVCFSearch),
    path('search/doexactSearch/', views.doexactSearch),
    path('search/doGeneDiseaseSearch/', views.doGeneDiseaseSearch),
    path('search/doGeneInfoSearch/', views.doGeneInfoSearch),
    path('search/doGFF3Search/', views.doGFF3Search),
    path('download/showfiellist', views.GetDownloadfileList),
    path('download/dodownload/', views.DownloadFile),
    path('download/dodownloadOntoAnnotation/', views.DownloadOntoAnnotation),
    path('download/dodownloadDBdump/', views.DownloadDBdump),
    path('search/getkeyfield', views.GetKeyField),
    path('search/doSOInfoSearch/', views.doSOInfoSearch),
    path('search/doVCFSearchWithOntology/', views.doVCFSearchWithOntology),
    path('search/DoVariantIDSearch/', views.doVariantIDSearch),
    path('search/DoRegionSearch/', views.doRegionSearch),
    path('search/DoOntologySearch/', views.doOntologySearch),
    path('search/DoGetInfoFields/', views.doGetInfoFields),
    path('search/GetDataLabel/', views.doGetInputDataLabel),
]

import configparser
cf = configparser.ConfigParser()
cf.read("project.config")
HASKBQA = cf.get("backend", "HASKBQA")=="True"
if HASKBQA:
    from mysite import KBQA
    urlpatterns.append(path('KBQA/domainsearch', KBQA.domainsearch))