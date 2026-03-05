from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    apply_tags_view,
    apply_tags_bulk_view,
    GradeView,
    ModuleInfoView,
    NoteURLView,
    NoteView,
    PrimaryTagView,
    SectionView,
    SubTagView,
    match_tags_view,
    obsidian_file_by_name,
    obsidian_file_view,
    scan_vault_tags_view,
    search_in_files,
    untagged_files_view,
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
    path("match-tags/", match_tags_view),
    path("obsidian-file/", obsidian_file_view),
    path("obsidian-file-by-name/", obsidian_file_by_name),
    path("search-in-files/", search_in_files),
    path("scan-vault-tags/", scan_vault_tags_view),
    path("untagged-files/", untagged_files_view),
    path("apply-tags/", apply_tags_view),
    path("apply-tags-bulk/", apply_tags_bulk_view),
]
