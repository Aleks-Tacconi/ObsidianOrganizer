from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GradeView,
    ModuleInfoView,
    NoteURLView,
    NoteView,
    PrimaryTagView,
    SectionView,
    SubTagView,
)

router = DefaultRouter()
router.register(r"primary-tags", PrimaryTagView)
router.register(r"subtags", SubTagView)
router.register(r"urls", NoteURLView)
router.register(r"notes", NoteView)
router.register(r"module-info", ModuleInfoView)
router.register(r"grades", GradeView)
router.register(r"sections", SectionView)

urlpatterns = [
    path("", include(router.urls)),
]
