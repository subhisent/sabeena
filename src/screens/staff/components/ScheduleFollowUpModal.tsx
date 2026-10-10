import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { doc, updateDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

import { theme } from '../../../theme';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';

export interface ScheduleFollowUpModalProps {
  visible: boolean;
  leadId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({
  visible,
  leadId,
  customerName,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [followUpType, setFollowUpType] = useState<'Call' | 'Visit' | 'Send quote'>('Call');
  const [datePreset, setDatePreset] = useState<'Tomorrow' | 'In 3 days' | 'Next week' | 'Pick date'>('Pick date');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(11, 0, 0, 0);
    return d;
  });
  const [timePreset, setTimePreset] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Custom'>('Morning');
  const [reminder, setReminder] = useState('15 min before');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const monthTitle = useMemo(() => {
    return calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarMonth]);

  const daysInMonth = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Adjust for Monday start (0: Mon, 6: Sun)
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const days: (number | null)[] = [];
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [calendarMonth]);

  const formattedSelected = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [selectedDate]);

  const handleSelectDatePreset = (preset: 'Tomorrow' | 'In 3 days' | 'Next week' | 'Pick date') => {
    setDatePreset(preset);
    const d = new Date();
    if (preset === 'Tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'In 3 days') {
      d.setDate(d.getDate() + 3);
    } else if (preset === 'Next week') {
      d.setDate(d.getDate() + 7);
    }
    d.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setSelectedDate(d);
  };

  const handleSelectCalendarDay = (day: number) => {
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    d.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setSelectedDate(d);
  };

  const handleSelectTimePreset = (t: 'Morning' | 'Afternoon' | 'Evening' | 'Custom') => {
    setTimePreset(t);
    const d = new Date(selectedDate);
    if (t === 'Morning') d.setHours(10, 0, 0, 0);
    else if (t === 'Afternoon') d.setHours(14, 30, 0, 0);
    else if (t === 'Evening') d.setHours(17, 30, 0, 0);
    setSelectedDate(d);
  };

  const handleSave = async () => {
    if (!leadId) return;
    setSaving(true);

    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        followUpAt: Timestamp.fromDate(selectedDate),
        updatedAt: serverTimestamp(),
      });

      const interactionsRef = collection(leadRef, 'interactions');
      await addDoc(interactionsRef, {
        type: 'status',
        title: `Follow-up scheduled: ${followUpType}`,
        note: note.trim() || `Follow-up scheduled for ${formattedSelected}`,
        authorId: user?.uid || '',
        authorName: user?.name || 'Staff',
        createdAt: serverTimestamp(),
      });

      onSuccess();
    } catch (err: any) {
      alert(`Error saving follow-up: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.notch} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Schedule follow-up</Text>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Type selector */}
            <Text style={styles.sectionLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['Call', 'Visit', 'Send quote'] as const).map((tp) => {
                const isSel = followUpType === tp;
                return (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.typePill, isSel && styles.typePillSelected]}
                    onPress={() => setFollowUpType(tp)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeText, isSel && styles.typeTextSelected]}>{tp}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date presets */}
            <Text style={styles.sectionLabel}>Date</Text>
            <View style={styles.datePresetRow}>
              {(['Tomorrow', 'In 3 days', 'Next week', 'Pick date'] as const).map((pr) => {
                const isSel = datePreset === pr;
                return (
                  <TouchableOpacity
                    key={pr}
                    style={[styles.presetChip, isSel && styles.presetChipSelected]}
                    onPress={() => handleSelectDatePreset(pr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetChipText, isSel && styles.presetChipTextSelected]}>
                      {pr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar when Pick date is active */}
            {datePreset === 'Pick date' && (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      const prev = new Date(calendarMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarMonth(prev);
                    }}
                    style={styles.monthNavBtn}
                  >
                    <Feather name="chevron-left" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>{monthTitle}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const next = new Date(calendarMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarMonth(next);
                    }}
                    style={styles.monthNavBtn}
                  >
                    <Feather name="chevron-right" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.weekRow}>
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
                    <Text key={w} style={styles.weekText}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Days grid */}
                <View style={styles.daysGrid}>
                  {daysInMonth.map((day, idx) => {
                    if (day === null) {
                      return <View key={`empty-${idx}`} style={styles.dayCell} />;
                    }
                    const isSelectedDay =
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === calendarMonth.getMonth() &&
                      selectedDate.getFullYear() === calendarMonth.getFullYear();

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[styles.dayCell, isSelectedDay && styles.dayCellSelected]}
                        onPress={() => handleSelectCalendarDay(day)}
                      >
                        <Text style={[styles.dayText, isSelectedDay && styles.dayTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Time Presets */}
            <Text style={styles.sectionLabel}>Time</Text>
            <View style={styles.timePresetRow}>
              {(['Morning', 'Afternoon', 'Evening', 'Custom'] as const).map((t) => {
                const isSel = timePreset === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.presetChip, isSel && styles.presetChipSelected]}
                    onPress={() => handleSelectTimePreset(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetChipText, isSel && styles.presetChipTextSelected]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected summary */}
            <View style={styles.selectedRow}>
              <Feather name="calendar" size={16} color={theme.colors.muted} />
              <Text style={styles.selectedLabel}>Selected</Text>
              <Text style={styles.selectedValue}>{formattedSelected}</Text>
            </View>

            {/* Reminder */}
            <Text style={styles.sectionLabel}>Reminder</Text>
            <View style={styles.reminderDropdown}>
              <Text style={styles.reminderText}>{reminder}</Text>
              <Feather name="chevron-down" size={18} color={theme.colors.muted} />
            </View>

            {/* Note */}
            <Text style={styles.sectionLabel}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Share competitive rate card"
              placeholderTextColor={theme.colors.muted}
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save follow-up</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  notch: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  customerName: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    paddingTop: theme.spacing.md,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    padding: 4,
    backgroundColor: '#F8FAFC',
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.pill,
  },
  typePillSelected: {
    backgroundColor: theme.colors.black,
  },
  typeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  typeTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  datePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  presetChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  presetChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  presetChipTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  calendarCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: 10,
    ...theme.shadows.card,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.text,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekText: {
    width: 36,
    textAlign: 'center',
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.black,
    borderRadius: 18,
  },
  dayText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
  },
  dayTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.bold,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#F8FAFC',
    marginTop: 12,
  },
  selectedLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  selectedValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 'auto',
  },
  reminderDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  reminderText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...theme.shadows.card,
  },
  saveBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.white,
  },
});

export default ScheduleFollowUpModal;
