from django.urls import include, path
from rest_framework.routers import DefaultRouter

from tasks.views import RegisterView, TaskViewSet

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("", include(router.urls)),
]
