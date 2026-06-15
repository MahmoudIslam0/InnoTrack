"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

interface User {
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  register: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    departmentId: number;
    gpa: number;
    graduationYear: number;
  }) => Promise<any>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
  verifyResetCode: (payload: { email: string; token: string }) => Promise<any>;
  resetPassword: (payload: { email: string; token: string; newPassword: string }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if tokens exist in localStorage on startup
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Clear if corrupt
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/Auth/login", { email, password: pass });
      
      // Response model: { accessToken, refreshToken, name, role }
      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
        if (response.refreshToken) {
          localStorage.setItem("refreshToken", response.refreshToken);
        }
        
        const userData: User = {
          name: response.name || "User",
          role: response.role || "Student",
        };
        
        localStorage.setItem("user", JSON.stringify(userData));
        setToken(response.accessToken);
        setUser(userData);
      }
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    departmentId: number;
    gpa: number;
    graduationYear: number;
  }) => {
    setIsLoading(true);
    try {
      // Backend expects Capitalized fields or standard JSON mapping. DTO property names:
      // FirstName, LastName, Email, Password, DepartmentId, GPA, GraduationYear
      const response = await api.post("/api/Auth/register", {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        password: payload.password,
        departmentId: payload.departmentId,
        gpa: payload.gpa,
        graduationYear: payload.graduationYear,
      });

      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
        if (response.refreshToken) {
          localStorage.setItem("refreshToken", response.refreshToken);
        }
        
        const userData: User = {
          name: response.name || `${payload.firstName} ${payload.lastName}`,
          role: response.role || "Student",
        };
        
        localStorage.setItem("user", JSON.stringify(userData));
        setToken(response.accessToken);
        setUser(userData);
      }
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Best effort logout on backend if authenticated
      const token = localStorage.getItem("accessToken");
      if (token) {
        await api.post("/api/Auth/logout").catch(() => {});
      }
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/Auth/forgot-password", { email });
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyResetCode = async (payload: { email: string; token: string }) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/Auth/verify-reset-code", payload);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (payload: { email: string; token: string; newPassword: string }) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/Auth/reset-password", payload);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        verifyResetCode,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
