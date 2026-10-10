import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Card } from '../../components';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();

  // Mode: Visual login theme toggle (Admin vs Staff)
  const [activeTab, setActiveTab] = useState<'admin' | 'staff'>('admin');
  const [identifier, setIdentifier] = useState('admin@sabeena.test');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTabChange = (tab: 'admin' | 'staff') => {
    setActiveTab(tab);
    setErrorMessage(null);
    if (tab === 'admin') {
      setIdentifier('admin@sabeena.test');
      setPassword('Admin@123');
    } else {
      setIdentifier('arun.k@sabeena.test');
      setPassword('Password@123');
    }
  };

  const handleSignIn = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both Email / Staff ID and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await signIn(identifier, password, activeTab);
    } catch (error: any) {
      console.error('Login error:', error);
      const code = error?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        setErrorMessage('Incorrect email/password, or user account not found.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('The email address is badly formatted.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Temporarily blocked due to many failed login attempts.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Network error. Check your internet connection.');
      } else {
        setErrorMessage(error?.message || 'Failed to sign in. Check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Illustration Badge */}
        <View style={styles.illustrationWrapper}>
          <View style={styles.illustrationCircle}>
            <Feather
              name={activeTab === 'admin' ? 'shield' : 'users'}
              size={36}
              color={theme.colors.primary}
            />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>
          {activeTab === 'admin' ? 'Admin Login' : 'Staff Login'}
        </Text>
        <Text style={styles.subtitle}>
          Manage enquiries, assign field tasks, and track your daily sales pipeline in real-time.
        </Text>

        {/* Card Form */}
        <Card style={styles.card} padding="lg">
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={14} color={theme.colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Identifier Input */}
          <Text style={styles.inputLabel}>STAFF ID OR CORPORATE EMAIL</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. admin@sabeena.test or arun.k"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                if (errorMessage) setErrorMessage(null);
              }}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color={theme.colors.muted}
              />
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, isLoading && styles.signInBtnDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.signInBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Remember me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Feather name="check" size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>LOGIN AS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Toggle Segment: Admin / Staff */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'admin' && styles.toggleBtnActive]}
              onPress={() => handleTabChange('admin')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  activeTab === 'admin' && styles.toggleBtnTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'staff' && styles.toggleBtnActive]}
              onPress={() => handleTabChange('staff')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  activeTab === 'staff' && styles.toggleBtnTextActive,
                ]}
              >
                Staff
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerTagline}>Your business. Our priority.</Text>
          <Text style={styles.footerLegal}>
            Sabena Sealers Sales CRM • Enterprise 256-bit AES
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 26,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.elevated,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.danger,
    flex: 1,
  },
  inputLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  signInBtn: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...theme.shadows.card,
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.white,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  checkboxLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  forgotText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginHorizontal: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.radius.md,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.black,
  },
  toggleBtnText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  toggleBtnTextActive: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerTagline: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  footerLegal: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
});

export default LoginScreen;
