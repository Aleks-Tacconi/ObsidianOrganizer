from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    apply_tags_view,
    apply_tags_bulk_view,
    category_membership_view,
    GradeView,
    ModuleInfoView,
    NoteURLView,
    NoteView,
    PrimaryTagView,
    remove_tags_bulk_view,
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
    path("category-membership/", category_membership_view),
    path("remove-tags-bulk/", remove_tags_bulk_view),
    path("rag/", include("api.rag.urls")),
]
