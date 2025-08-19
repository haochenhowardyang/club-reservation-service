"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface WhitelistEmail {
  id: number;
  email: string;
  phone: string | null;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserManagementContentProps {
  session: Session;
}

export default function UserManagementContent({ session }: UserManagementContentProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEmail[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingWhitelist, setIsLoadingWhitelist] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "whitelist">("users");
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [currentWhitelistItem, setCurrentWhitelistItem] = useState<WhitelistEmail | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again.");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch whitelist
  useEffect(() => {
    const fetchWhitelist = async () => {
      try {
        setIsLoadingWhitelist(true);
        const response = await fetch("/api/admin/whitelist");
        if (!response.ok) {
          throw new Error("Failed to fetch whitelist");
        }
        const data = await response.json();
        setWhitelist(data);
      } catch (err) {
        console.error("Error fetching whitelist:", err);
        setError("Failed to load whitelist. Please try again.");
      } finally {
        setIsLoadingWhitelist(false);
      }
    };

    fetchWhitelist();
  }, []);

  // Add email to whitelist
  const handleAddToWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    try {
      const response = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: newEmail.trim(),
          phone: newPhone.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add email to whitelist");
      }

      const data = await response.json();
      setWhitelist([...whitelist, data]);
      setNewEmail("");
      setNewPhone("");
      setSuccess(`${newEmail} has been added to the whitelist`);
    } catch (err) {
      console.error("Error adding to whitelist:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Remove email from whitelist
  const handleRemoveFromWhitelist = async (id: number) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/whitelist/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove email from whitelist");
      }

      setWhitelist(whitelist.filter((item) => item.id !== id));
      setSuccess("Email has been removed from the whitelist");
    } catch (err) {
      console.error("Error removing from whitelist:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userEmail: string, isActive: boolean) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/users/${encodeURIComponent(userEmail)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      setUsers(
        users.map((user) =>
          user.email === userEmail ? { ...user, isActive: !isActive } : user
        )
      );
      setSuccess(`User status updated successfully`);
    } catch (err) {
      console.error("Error updating user status:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Toggle user role
  const toggleUserRole = async (userEmail: string, currentRole: string) => {
    try {
      setError(null);
      setSuccess(null);

      const newRole = currentRole === "admin" ? "user" : "admin";

      const response = await fetch(`/api/admin/users/${encodeURIComponent(userEmail)}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user role");
      }

      setUsers(
        users.map((user) =>
          user.email === userEmail ? { ...user, role: newRole } : user
        )
      );
      setSuccess(`User role updated to ${newRole}`);
    } catch (err) {
      console.error("Error updating user role:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Update phone for whitelist entry
  const handleUpdatePhone = async (id: number, phone: string) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/whitelist/${id}/phone`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error("Failed to update phone number");
      }

      // Update whitelist state with new phone number
      setWhitelist(
        whitelist.map((item) =>
          item.id === id ? { ...item, phone } : item
        )
      );
      setSuccess("Phone number updated successfully");
    } catch (err) {
      console.error("Error updating phone number:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Delete user completely
  const handleDeleteUser = async (user: User) => {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      // Use email instead of id for delete URL since database now uses email as primary key
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.email)}/delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }

      const result = await response.json();
      
      // Remove user from the list (filter by email since id might be undefined)
      setUsers(users.filter(u => u.email !== user.email));
      
      // Close modal
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      
      setSuccess(`User ${result.deletedUser.email} has been completely deleted along with all their data`);
      
      console.log("Deletion summary:", result.deletedCounts);
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users and email whitelist
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("users")}
              className={`${
                activeTab === "users"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("whitelist")}
              className={`${
                activeTab === "whitelist"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Email Whitelist
            </button>
          </nav>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {isLoadingUsers ? (
                  <div className="py-10 text-center">
                    <svg
                      className="animate-spin h-8 w-8 text-indigo-500 mx-auto"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-500">No users found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Name
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Email
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Role
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Joined
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.email}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name ? (
                                  user.name
                                ) : (
                                  <span className="text-gray-400 italic">
                                    Not logged in yet
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() =>
                                    toggleUserRole(user.email, user.role)
                                  }
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  {user.role === "admin"
                                    ? "Remove Admin"
                                    : "Make Admin"}
                                </button>
                                <button
                                  onClick={() =>
                                    toggleUserStatus(user.email, user.isActive)
                                  }
                                  className={`${
                                    user.isActive
                                      ? "text-red-600 hover:text-red-900"
                                      : "text-green-600 hover:text-green-900"
                                  }`}
                                >
                                  {user.isActive ? "Deactivate" : "Activate"}
                                </button>
                                {user.role !== "admin" && user.email !== session.user.email && (
                                  <button
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="text-red-700 hover:text-red-900 font-medium"
                                  >
                                    Delete User
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Whitelist Tab */}
        {activeTab === "whitelist" && (
          <div>
            <div className="mb-6">
              <form onSubmit={handleAddToWhitelist} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter email to whitelist"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter phone number (optional)"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add to Whitelist
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {isLoadingWhitelist ? (
                  <div className="py-10 text-center">
                    <svg
                      className="animate-spin h-8 w-8 text-indigo-500 mx-auto"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      Loading whitelist...
                    </p>
                  </div>
                ) : whitelist.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-500">
                      No emails in whitelist.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Email
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Phone
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Added On
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {whitelist.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {item.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {item.phone ? item.phone : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setCurrentWhitelistItem(item);
                                  setIsPhoneModalOpen(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                {item.phone ? "Edit Phone" : "Add Phone"}
                              </button>
                              <button
                                onClick={() =>
                                  handleRemoveFromWhitelist(item.id)
                                }
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Phone Edit Modal */}
      {isPhoneModalOpen && currentWhitelistItem && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentWhitelistItem.phone ? "Edit Phone Number" : "Add Phone Number"}
            </h3>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdatePhone(currentWhitelistItem.id, newPhone);
                setIsPhoneModalOpen(false);
                setNewPhone("");
              }}
            >
              <div className="mb-4">
                <label htmlFor="modal-phone" className="block text-sm font-medium text-gray-700">
                  Phone Number for {currentWhitelistItem.email}
                </label>
                <input
                  type="tel"
                  id="modal-phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={currentWhitelistItem.phone || "Enter phone number"}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPhoneModalOpen(false);
                    setNewPhone("");
                  }}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Delete User Permanently
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-3">
                Are you sure you want to permanently delete <span className="font-semibold">{userToDelete.name || userToDelete.email}</span>? 
                This action cannot be undone and will delete:
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• User account and profile</li>
                  <li>• All reservations (bar, mahjong, poker)</li>
                  <li>• Poker player record and statistics</li>
                  <li>• Waitlist entries and history</li>
                  <li>• All notifications sent to user</li>
                  <li>• SMS queue entries</li>
                  <li>• Whitelist entry (if exists)</li>
                  <li>• All associated tokens and confirmations</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will completely remove the user from all systems. 
                  They will need to be re-added to the whitelist to access the site again.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={isDeleting}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete)}
                disabled={isDeleting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete User Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
