from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Allow access to an object only to its owner."""

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id
