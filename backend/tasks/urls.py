from django.urls import include, path
from rest_framework.permissions import AllowAny
from rest_framework.routers import APIRootView, DefaultRouter

from tasks.views import RegisterView, TaskViewSet


class PublicAPIRootView(APIRootView):
    """The root just lists endpoint names, so it doesn't need auth."""

    permission_classes = (AllowAny,)


class PublicRouter(DefaultRouter):
    APIRootView = PublicAPIRootView


router = PublicRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("", include(router.urls)),
]
