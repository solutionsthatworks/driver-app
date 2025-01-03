import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaTimes, FaMapMarkedAlt, FaUser, FaSignOutAlt, FaCog } from "react-icons/fa";
import axios from "axios";
import "./SidebarMenu.css";

const SidebarMenu = ({ isOpen, toggleMenu }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get("http://localhost/laundry/public/api/user/profile", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUser(response.data.user);
        } catch (error) {
            console.error("Failed to fetch user profile", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <div className={`sidebar ${isOpen ? "open" : ""}`}>
            <div className="sidebar-header">
                {user && (
                    <div className="user-info">
                        <img src={user.avatar || "/default-avatar.png"} alt="User Avatar" className="avatar" />
                        <h3>{user.name}</h3>
                    </div>
                )}
                <FaTimes className="close-btn" onClick={toggleMenu} />
            </div>

            <ul className="sidebar-menu">
                <li>
                    <Link to="/dashboard" onClick={toggleMenu}>
                        <FaMapMarkedAlt /> Dashboard
                    </Link>
                </li>
                <li>
                    <Link to="/profile" onClick={toggleMenu}>
                        <FaUser /> Profile
                    </Link>
                </li>
                <li>
                    <Link to="/settings" onClick={toggleMenu}>
                        <FaCog /> Settings
                    </Link>
                </li>
                <li onClick={handleLogout}>
                    <FaSignOutAlt /> Logout
                </li>
            </ul>
        </div>
    );
};

export default SidebarMenu;
