import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // Kunin ang dating user kapag nag-refresh ang browser
  const savedUser = localStorage.getItem('pos_user');

  const user = ref(savedUser ? JSON.parse(savedUser) : null);

  const login = (userData) => {
    user.value = userData;

    // I-save sa browser para hindi mawala sa refresh
    localStorage.setItem('pos_user', JSON.stringify(userData));
  };

  const logout = () => {
    user.value = null;

    // Burahin ang saved login
    localStorage.removeItem('pos_user');
  };

  // Kunin ang JWT token para sa protected API requests
  const getToken = () => {
    return user.value?.token || null;
  };

  return {
    user,
    login,
    logout,
    getToken
  };
});