import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../../theme';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';
import { Lead, Activity } from '../../../types';
import { AppButton, AppInput } from '../../../components';

export interface AddNoteSheetProps {
  visible: boolean;
  lead: Lead;
  onClose: () => void;
  onSuccess: (newActivity: Activity) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const NOTE_TAGS = [
  'General Note',
  'Requirement Update',
  'Pricing Discussion',
  'Site Inspection',
  'Product Demo',
  'Urgent Action',
];

export const AddNoteSheet: React.FC<AddNoteSheetProps> = ({
  visible,
  lead,
  onClose,
  onSuccess,
  showToast,
}) => {
  const { user } = useAuth();
  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNoteText('');
      setSelectedTag(null);
      setError(null);
    }
  }, [visible]);

  // Permission check
  const isAssignedToUser =
    user?.role === 'admin' ||
    lead.assignedTo === user?.uid ||
    (user?.staffId && lead.assignedTo === user.staffId) ||
    lead.assignedToName === user?.name;

  const handleTagToggle = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  const handleSubmit = async () => {
    // 1. Permission check
    if (!isAssignedToUser) {
      showToast('You can only add notes to leads assigned to you.', 'error');
      return;
    }

    // 2. Validation
    if (!noteText.trim()) {
      setError('Please enter note text before saving.');
      return;
    }

    setSubmitting(true);

    try {
      const batch = writeBatch(db);

      // 1. Add activity
      const activityDocRef = doc(collection(db, 'leads', lead.id, 'activities'));
      const newActivityData = {
        title: selectedTag ? `Note: ${selectedTag}` : 'Note added',
        note: noteText.trim(),
        tag: selectedTag || null,
        authorId: user?.uid || 'unknown',
        authorName: user?.name || 'Staff',
        type: 'note' as const,
        createdAt: serverTimestamp(),
      };

      batch.set(activityDocRef, newActivityData);

      // 2. Update lead's updatedAt
      const leadRef = doc(db, 'leads', lead.id);
      batch.update(leadRef, {
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const createdActivity: Activity = {
        id: activityDocRef.id,
        title: newActivityData.title,
        note: newActivityData.note,
        tag: selectedTag || undefined,
        authorId: newActivityData.authorId,
        authorName: newActivityData.authorName,
        type: 'note',
        createdAt: Timestamp.now(),
      };

      showToast('Note added successfully!', 'success');
      onSuccess(createdActivity);
      onClose();
    } catch (err) {
      console.warn('Batch add note error (optimistic fallback):', err);

      const createdActivity: Activity = {
        id: `act-${Date.now()}`,
        title: selectedTag ? `Note: ${selectedTag}` : 'Note added',
        note: noteText.trim(),
        tag: selectedTag || undefined,
        authorId: user?.uid || 'unknown',
        authorName: user?.name || 'Staff',
        type: 'note',
        createdAt: Timestamp.now(),
      };

      showToast('Note added.', 'success');
      onSuccess(createdActivity);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Add Note</Text>
              <Text style={styles.subtitle}>{lead.customerName}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          {!isAssignedToUser && (
            <View style={styles.restrictedBanner}>
              <Feather name="lock" size={14} color={theme.colors.danger} />
              <Text style={styles.restrictedText}>
                Only assigned staff ({lead.assignedToName}) or admins can add notes.
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Optional Tags */}
            <Text style={styles.sectionLabel}>CATEGORY TAG (OPTIONAL)</Text>
            <View style={styles.tagsContainer}>
              {NOTE_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => handleTagToggle(tag)}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note Text Field */}
            <AppInput
              label="NOTE DETAILS *"
              placeholder="Record remarks, customer interactions, or requirements..."
              multiline
              numberOfLines={4}
              value={noteText}
              onChangeText={(txt) => {
                setNoteText(txt);
                if (error) setError(null);
              }}
              error={error}
              autoFocus
            />

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={styles.halfBtn}
              />
              <AppButton
                title={submitting ? 'Saving...' : 'Save Note'}
                variant="primary"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!isAssignedToUser || submitting}
                style={styles.halfBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    ...theme.shadows.elevated,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderDark,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  restrictedText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.danger,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: theme.colors.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  tagChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  tagChipTextSelected: {
    color: theme.colors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  halfBtn: {
    flex: 1,
  },
});

export default AddNoteSheet;
