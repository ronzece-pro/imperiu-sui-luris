"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "blocked" | "banned";
  createdAt: string;
  lurisBalance: number;
}

interface Props {
  onClose?: () => void;
}

export default function AdminUserManagement({ onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<
    "view" | "edit" | "block" | "ban" | "delete"
  >("view");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      // Mock data - in production fetch from API
      const mockUsers: User[] = [
        {
          id: "user_1",
          name: "Ion Popescu",
          email: "ion@example.com",
          role: "Cetățean",
          status: "active",
          createdAt: "2024-01-15",
          lurisBalance: 1500,
        },
        {
          id: "user_2",
          name: "Maria Ionescu",
          email: "maria@example.com",
          role: "Business",
          status: "active",
          createdAt: "2024-01-20",
          lurisBalance: 5000,
        },
        {
          id: "user_3",
          name: "Alexandru Ștefan",
          email: "alex@example.com",
          role: "Cetățean",
          status: "blocked",
          createdAt: "2024-02-01",
          lurisBalance: 0,
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserAction = async (
    user: User,
    action: "block" | "ban" | "delete"
  ) => {
    try {
      // In production, send to API
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status:
                  action === "delete" ? ("banned" as const) : (action as any),
              }
            : u
        )
      );
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const openModal = (user: User, action: typeof modalAction) => {
    setSelectedUser(user);
    setModalAction(action);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <input
          type="text"
          placeholder="Căutare după nume sau email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nume</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Luris</th>
                  <th className="px-4 py-3 text-left font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-gray-400">{user.email}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.status === "active"
                            ? "bg-green-900 text-green-200"
                            : user.status === "blocked"
                            ? "bg-yellow-900 text-yellow-200"
                            : "bg-red-900 text-red-200"
                        }`}
                      >
                        {user.status === "active"
                          ? "Activ"
                          : user.status === "blocked"
                          ? "Blocat"
                          : "Banat"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.lurisBalance}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openModal(user, "view")}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition"
                        >
                          Vizualizare
                        </button>
                        <button
                          onClick={() => openModal(user, "block")}
                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs transition"
                        >
                          Blocare
                        </button>
                        <button
                          onClick={() => openModal(user, "ban")}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition"
                        >
                          Ban
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              {modalAction === "view"
                ? "Profil Utilizator"
                : modalAction === "block"
                ? "Blocare Utilizator"
                : "Ban Utilizator"}
            </h3>

            {modalAction === "view" ? (
              <div className="space-y-3 text-sm mb-6">
                <div>
                  <p className="text-gray-400">Nume</p>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-400">Rol</p>
                  <p className="font-medium">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="font-medium capitalize">{selectedUser.status}</p>
                </div>
                <div>
                  <p className="text-gray-400">Luris Balance</p>
                  <p className="font-medium">{selectedUser.lurisBalance}</p>
                </div>
                <div>
                  <p className="text-gray-400">Data Creării</p>
                  <p className="font-medium">{selectedUser.createdAt}</p>
                </div>
              </div>
            ) : (
              <div className="mb-6 text-gray-300">
                <p>
                  Sunteti sigur ca doriti sa{" "}
                  {modalAction === "block" ? "blocati" : "banati"}{" "}
                  <strong>{selectedUser.name}</strong>?
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Anulare
              </button>
              {modalAction !== "view" && (
                <button
                  onClick={() =>
                    handleUserAction(
                      selectedUser,
                      modalAction as "block" | "ban"
                    )
                  }
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    modalAction === "block"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Confirmare
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredUsers.length === 0 && !isLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
          <p>Nu s-au găsit utilizatori</p>
        </div>
      )}
    </div>
  );
}
