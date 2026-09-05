from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from tasks.models import Task

User = get_user_model()


class RegisterTests(APITestCase):
    def test_register_creates_user(self):
        url = reverse("register")
        payload = {"username": "alice", "email": "alice@example.com", "password": "supersecret1"}
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="alice").exists())
        self.assertNotIn("password", response.data)

    def test_register_rejects_short_password(self):
        url = reverse("register")
        payload = {"username": "bob", "email": "bob@example.com", "password": "short"}
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuthTokenTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="supersecret1")

    def test_obtain_token_with_valid_credentials(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {"username": "alice", "password": "supersecret1"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_obtain_token_with_invalid_credentials(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {"username": "alice", "password": "wrong"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TaskAPITests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="supersecret1")
        self.bob = User.objects.create_user(username="bob", password="supersecret1")
        self.alice_task = Task.objects.create(owner=self.alice, title="Alice's task")
        self.bob_task = Task.objects.create(owner=self.bob, title="Bob's task")

    def authenticate(self, user):
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {"username": user.username, "password": "supersecret1"})
        access = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_list_requires_authentication(self):
        url = reverse("task-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_only_returns_own_tasks(self):
        self.authenticate(self.alice)
        url = reverse("task-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [task["title"] for task in response.data["results"]]
        self.assertEqual(titles, ["Alice's task"])

    def test_create_task_assigns_current_user_as_owner(self):
        self.authenticate(self.alice)
        url = reverse("task-list")
        response = self.client.post(url, {"title": "New task", "description": "Do it"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Task.objects.get(id=response.data["id"])
        self.assertEqual(created.owner, self.alice)

    def test_retrieve_own_task(self):
        self.authenticate(self.alice)
        url = reverse("task-detail", args=[self.alice_task.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Alice's task")

    def test_cannot_retrieve_other_users_task(self):
        self.authenticate(self.alice)
        url = reverse("task-detail", args=[self.bob_task.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_own_task(self):
        self.authenticate(self.alice)
        url = reverse("task-detail", args=[self.alice_task.id])
        response = self.client.patch(url, {"completed": True})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alice_task.refresh_from_db()
        self.assertTrue(self.alice_task.completed)

    def test_cannot_update_other_users_task(self):
        self.authenticate(self.alice)
        url = reverse("task-detail", args=[self.bob_task.id])
        response = self.client.patch(url, {"completed": True})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.bob_task.refresh_from_db()
        self.assertFalse(self.bob_task.completed)

    def test_delete_own_task(self):
        self.authenticate(self.alice)
        url = reverse("task-detail", args=[self.alice_task.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=self.alice_task.id).exists())

    def test_cannot_delete_other_users_task(self):
        self.authenticate(self.alice)
        url = reverse("task-detail", args=[self.bob_task.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Task.objects.filter(id=self.bob_task.id).exists())
