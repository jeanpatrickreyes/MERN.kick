import { Route, BrowserRouter, Routes, Navigate } from "react-router-dom";
import MatchsPage from "../pages/matchs/matchs";
import DetailsMatchPage from "../pages/details_match/details_match";
import LoginPage from "../pages/login/login";
import ForgetPasswordPage from "../pages/forget_password/forget_password";
import useAuthStore from "../store/userAuthStore";
import HomePage from "../pages/home/home";
import RegisterPage from "../pages/register/register";
import MembersPage from "../pages/admin/member/member";
import AdminsPage from "../pages/admin/admins/admins";
import RecordsAdminPage from "../pages/admin/records/records";
import RecordsPage from "../pages/records/records";

const AppRoutes = () => {
    const { userRole } = useAuthStore();
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forget-password" element={<ForgetPasswordPage />} />
                <Route path="/records" element={<RecordsPage />} />

                {userRole ?
                    <Route path="/matches" element={<MatchsPage />} />
                    : undefined
                }
                {userRole ?
                    <Route path="/details-match/:id" element={<DetailsMatchPage />} />
                    : undefined
                }


                {userRole && (userRole === "admin" || userRole === "subadmin") ?
                    <Route path="/admin/members" element={<MembersPage />} />
                    : undefined
                }
                {userRole && (userRole === "admin" || userRole === "subadmin") ?
                    <Route path="/admin/admins" element={<AdminsPage />} />
                    : undefined
                }
                {userRole && (userRole === "admin" || userRole === "subadmin") ?
                    <Route path="/admin/records" element={<RecordsAdminPage />} />
                    : undefined
                }

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;