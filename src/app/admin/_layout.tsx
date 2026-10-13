import { Tabs } from 'expo-router';
import { useAuth } from '../../auth';
import { AppTabs, tab } from '../../components/tabs';

export default function AdminTabs() {
  const { me } = useAuth();
  const pending = me?.pendingRequests ?? 0;
  return (
    <AppTabs>
      <Tabs.Screen name="index" options={tab('Home', undefined, undefined, false)} />
      <Tabs.Screen name="transfer" options={tab('Transfer', 'Transfer Kits', 'Send from central stock')} />
      <Tabs.Screen
        name="requests"
        options={{ ...tab('Requests', 'Kit Requests', 'Review & approve'), tabBarBadge: pending > 0 ? (pending > 9 ? '9+' : pending) : undefined }}
      />
      <Tabs.Screen name="activity" options={tab('Activity', 'Activity', 'Every kit movement')} />
      <Tabs.Screen name="settings" options={tab('Settings', 'Settings', 'Price, target & OTP')} />
    </AppTabs>
  );
}
