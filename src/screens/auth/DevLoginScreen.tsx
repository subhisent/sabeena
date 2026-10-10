import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import { AppButton, AppInput, Card } from '../../components';

export const DevLoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both Email/Staff ID and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await signIn(identifier, password);
    } catch (error: any) {
      console.error('DevLogin error:', error);
      const code = error?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMessage('Incorrect email/password, or user does not exist in Firebase Auth.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('The email address is badly formatted.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Access blocked temporarily due to many failed login attempts. Try again later.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Network error. Check your internet connection.');
      } else {
        setErrorMessage(error?.message || 'Failed to sign in. Please check your credentials.');
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
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card} padding="lg">
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DEV LOGIN (TEMPORARY)</Text>
          </View>

          <Text style={styles.title}>Sabena Sealers</Text>
          <Text style={styles.subtitle}>Sales CRM Foundation</Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <AppInput
            label="Email or Staff ID"
            placeholder="e.g. STF001 or admin@sabeena.test"
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (errorMessage) setErrorMessage(null);
            }}
            editable={!isLoading}
            leftIcon={<Feather name="user" size={18} color={theme.colors.muted} />}
          />

          <AppInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            editable={!isLoading}
            leftIcon={<Feather name="lock" size={18} color={theme.colors.muted} />}
          />

          <AppButton
            title="Sign In"
            onPress={handleSignIn}
            variant="primary"
            size="md"
            loading={isLoading}
            style={styles.submitButton}
          />

          <Text style={styles.note}>
            Note: Non-email inputs automatically resolve to &lt;id&gt;@sabeena.test
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    paddingVertical: theme.spacing.xl,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    marginBottom: theme.spacing.md,
  },
  badgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    ...theme.typography.h1,
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: theme.colors.dangerLight,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  note: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    color: theme.colors.muted,
  },
});

export default DevLoginScreen;
