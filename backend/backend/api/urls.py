from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NoteURLView, NoteView, PrimaryTagView, SubTagView

router = DefaultRouter()
router.register(r"primary-tags", PrimaryTagView)
router.register(r"subtags", SubTagView)
router.register(r"urls", NoteURLView)
router.register(r"notes", NoteView)

urlpatterns = [
    path("", include(router.urls)),
]
