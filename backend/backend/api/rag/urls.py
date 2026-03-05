"""URL configuration for RAG endpoints."""

from django.urls import path

from .views import (
    rag_health_view,
    rag_index_clear_view,
    rag_index_start_view,
    rag_index_status_view,
    rag_query_view,
    rag_stats_view,
)

urlpatterns = [
    path("query/", rag_query_view),
    path("index/start/", rag_index_start_view),
    path("index/status/", rag_index_status_view),
    path("index/", rag_index_clear_view),
    path("stats/", rag_stats_view),
    path("health/", rag_health_view),
]
