import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Car,
  Check,
  Clock,
  FlaskConical,
  IdCard,
  MapPin,
  Phone,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { LaboratoryDepartment, OfficerVisitor, VisitorType } from '../../types';
import { isValidPoBox } from '../../foodDrugIntake';
import { Button, DashboardHeader, DashboardPage, StatusPill } from '../common/Dashboard';
import { Select } from '../common/Select';
import { DESTINATION_LABORATORIES, laboratoryLabel } from '../../data/laboratories';

interface VisitorRegistrationPageProps {
  onRegister: (visitor: OfficerVisitor) => void;
  onCancel: () => void;
  currentUserName: string;
}


/** Police badge (service) numbers are numeric, at least 7 digits. */
const BADGE_PATTERN = /^\d{7,}$/;

/** Kenyan mobile numbers: 07XX / 01XX local format or +254 international, spaces ignored. */
const PHONE_PATTERN = /^(?:\+?254|0)\d{9}$/;

type FieldKey =
  | 'officerName'
  | 'badgeNumber'
  | 'phone'
  | 'nationalId'
  | 'station'
  | 'vehicleRegistration'
  | 'poBox'
  | 'exhibitsPresented';

const inputClass = (invalid?: boolean) =>
  `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-4 dark:bg-slate-950 dark:text-white ${
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60'
      : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/10 dark:border-slate-700'
  }`;

const Field: React.FC<{
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, icon: Icon, required, hint, error, className = '', children }) => (
  <div className={className}>
    <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-200">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      {label}
      {required ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-400">Optional</span>}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-xs text-rose-500">{error}</p>
    ) : (
      hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    )}
  </div>
);

const FormSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="grid grid-cols-1 gap-6 py-8 first:pt-0 lg:grid-cols-3 lg:gap-10">
    <div>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  </section>
);

export const VisitorRegistrationPage: React.FC<VisitorRegistrationPageProps> = ({
  onRegister,
  onCancel,
  currentUserName,
}) => {
  const [visitorType, setVisitorType] = useState<VisitorType>('POLICE_OFFICER');
  const [officerName, setOfficerName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [station, setStation] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [laboratory, setLaboratory] = useState<LaboratoryDepartment>(DESTINATION_LABORATORIES[0].value);
  const [poBox, setPoBox] = useState('');
  const [exhibitsPresented, setExhibitsPresented] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [arrival] = useState(() => new Date());
  const date = arrival.toISOString().slice(0, 10);
  const timeIn = arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isOfficer = visitorType === 'POLICE_OFFICER';

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!officerName.trim()) e.officerName = isOfficer ? "Enter the officer's full name." : "Enter the client's full name.";
    if (isOfficer && !BADGE_PATTERN.test(badgeNumber)) {
      e.badgeNumber = badgeNumber
        ? `Badge ID must be at least 7 digits (${badgeNumber.length} entered).`
        : 'Badge ID is required for police officers.';
    }
    const digits = phone.replace(/\s/g, '');
    if (!digits) e.phone = 'Mobile number is required.';
    else if (!PHONE_PATTERN.test(digits)) e.phone = 'Enter a valid mobile number, e.g. 0712 345 678.';
    if (!nationalId.trim()) e.nationalId = isOfficer ? 'National ID is required.' : 'National ID or passport number is required.';
    if (isOfficer && !exhibitsPresented.trim()) e.exhibitsPresented = 'Describe the exhibits / samples being submitted.';
    if (!station.trim()) e.station = isOfficer ? 'Enter the police station.' : 'Enter the organisation or address.';
    if (!isOfficer && !vehicleRegistration.trim()) e.vehicleRegistration = 'Vehicle registration is required for clients.';
    if (laboratory === 'Food & Drugs' && !isValidPoBox(poBox)) e.poBox = 'Use the format P.O Box NNNNN-NNNNN.';
    return e;
  }, [officerName, badgeNumber, phone, nationalId, exhibitsPresented, station, vehicleRegistration, laboratory, poBox, isOfficer]);

  const showError = (key: FieldKey) => ((touched[key] || submitAttempted) ? errors[key] : undefined);
  const blur = (key: FieldKey) => () => setTouched((t) => ({ ...t, [key]: true }));
  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isValid) return;
    const now = new Date();
    onRegister({
      id: `V-${String(now.getTime()).slice(-5)}`,
      date,
      visitorType,
      officerName: officerName.trim(),
      badgeNumber: isOfficer ? badgeNumber : undefined,
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      station: station.trim(),
      poBox: laboratory === 'Food & Drugs' ? poBox.trim() : undefined,
      // Officers arrive in service vehicles — plates are only captured for clients.
      vehicleRegistration: !isOfficer ? vehicleRegistration.trim() : undefined,
      laboratory,
      documentsVerified: [],
      exhibitsPresented: exhibitsPresented.trim(),
      purposeOfVisit: 'Evidence submission',
      documentsPresented: '',
      timeIn: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      receptionistName: currentUserName,
      signatureCaptured: false,
      status: 'Awaiting Laboratory Reception',
    });
  };

  const typeOptions: { value: VisitorType; label: string; description: string; icon: typeof Shield }[] = [
    { value: 'POLICE_OFFICER', label: 'Police officer', description: 'Submitting seized exhibits on behalf of a station', icon: Shield },
    { value: 'GENERAL_CLIENT', label: 'Client', description: 'Member of the public, company or institution', icon: User },
  ];

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Reception', 'Register visitor']}
        title="Register new visitor"
        description="Record an arriving officer or client and route them to the right laboratory. Fields marked * are required."
        meta={<StatusPill tone="emerald" pulse>Desk open</StatusPill>}
        actions={
          <Button icon={ArrowLeft} onClick={onCancel}>
            Back to desk
          </Button>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          <FormSection
            title="Visitor type"
            description="Determines which credentials are required. Officers are identified by badge number; clients must record their vehicle."
          >
            <div role="radiogroup" aria-label="Visitor type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {typeOptions.map((opt) => {
                const selected = visitorType === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setVisitorType(opt.value)}
                    className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-amber-500 bg-amber-500/5 ring-4 ring-amber-500/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{opt.description}</span>
                    </span>
                    {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-amber-500" />}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection
            title="Identity"
            description={
              isOfficer
                ? 'Confirm the officer against their service card. The badge ID is the primary identifier on the register.'
                : 'Capture the client as shown on their national ID or passport.'
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label={isOfficer ? 'Officer name' : 'Client name'}
                icon={User}
                required
                error={showError('officerName')}
              >
                <input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  onBlur={blur('officerName')}
                  placeholder={isOfficer ? 'e.g. Cpl. Jane Mwangi' : 'e.g. John Otieno'}
                  className={inputClass(!!showError('officerName'))}
                  autoFocus
                />
              </Field>
              {isOfficer ? (
                <Field
                  label="Badge ID No."
                  icon={BadgeCheck}
                  required
                  hint="Numbers only, at least 7 digits."
                  error={showError('badgeNumber')}
                >
                  <input
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value.replace(/\D/g, ''))}
                    onBlur={blur('badgeNumber')}
                    inputMode="numeric"
                    placeholder="e.g. 2345678"
                    className={`${inputClass(!!showError('badgeNumber'))} font-mono tracking-wider`}
                  />
                </Field>
              ) : (
                <Field label="National ID / Passport" icon={IdCard} required error={showError('nationalId')}>
                  <input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    onBlur={blur('nationalId')}
                    placeholder="e.g. 31234567"
                    className={inputClass(!!showError('nationalId'))}
                  />
                </Field>
              )}
              <Field label="Mobile number" icon={Phone} required error={showError('phone')}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={blur('phone')}
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  className={inputClass(!!showError('phone'))}
                />
              </Field>
              {isOfficer && (
                <Field label="National ID" icon={IdCard} required error={showError('nationalId')}>
                  <input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    onBlur={blur('nationalId')}
                    placeholder="e.g. 31234567"
                    className={inputClass(!!showError('nationalId'))}
                  />
                </Field>
              )}
            </div>
          </FormSection>

          <FormSection
            title={isOfficer ? 'Station' : 'Origin & transport'}
            description={
              isOfficer
                ? 'The station the officer is submitting on behalf of.'
                : 'Where the client is coming from and the vehicle parked on the premises.'
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label={isOfficer ? 'Police station' : 'Organisation / address'}
                icon={isOfficer ? Building2 : MapPin}
                required
                error={showError('station')}
                className={isOfficer ? 'sm:col-span-2' : ''}
              >
                <input
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  onBlur={blur('station')}
                  placeholder={isOfficer ? 'e.g. Kilimani Police Station' : 'e.g. Acme Foods Ltd, Nairobi'}
                  className={inputClass(!!showError('station'))}
                />
              </Field>
              {!isOfficer && (
                <Field
                  label="Vehicle registration"
                  icon={Car}
                  required
                  hint="Number plate, e.g. KDG 221B."
                  error={showError('vehicleRegistration')}
                >
                  <input
                    value={vehicleRegistration}
                    onChange={(e) => setVehicleRegistration(e.target.value.toUpperCase())}
                    onBlur={blur('vehicleRegistration')}
                    placeholder="e.g. KDG 221B"
                    className={`${inputClass(!!showError('vehicleRegistration'))} font-mono uppercase tracking-wider`}
                  />
                </Field>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Destination"
            description="The laboratory receiving the submission is notified as soon as the visitor is registered."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Destination laboratory" icon={FlaskConical} required>
                <Select<LaboratoryDepartment>
                  value={laboratory}
                  onChange={setLaboratory}
                  options={DESTINATION_LABORATORIES}
                  aria-label="Destination laboratory"
                />
              </Field>
              {laboratory === 'Food & Drugs' && (
                <Field
                  label="P.O Box"
                  icon={MapPin}
                  required
                  hint={<>Required for Foods, Drugs and Chemical Substance. Format: <span className="font-mono">P.O Box NNNNN-NNNNN</span></>}
                  error={showError('poBox')}
                >
                  <input
                    value={poBox}
                    onChange={(e) => setPoBox(e.target.value)}
                    onBlur={blur('poBox')}
                    placeholder="e.g. P.O Box 40245-00100"
                    className={inputClass(!!showError('poBox'))}
                  />
                </Field>
              )}
              <Field
                label="Exhibits / samples presented"
                required={isOfficer}
                error={showError('exhibitsPresented')}
                className="sm:col-span-2"
              >
                <textarea
                  value={exhibitsPresented}
                  onChange={(e) => setExhibitsPresented(e.target.value)}
                  onBlur={blur('exhibitsPresented')}
                  placeholder="e.g. 1 sealed sachet of white powder (exh A-112)"
                  className={`${inputClass(!!showError('exhibitsPresented'))} min-h-[120px] resize-y`}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Arrival record"
            description="Stamped automatically. Departure time is recorded later from Check Out."
          >
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: 'Date', value: date, icon: Calendar },
                { label: 'Time in', value: timeIn, icon: Clock },
                { label: 'Received by', value: currentUserName, icon: UserCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-10 mt-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur sm:px-5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isValid ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Ready to register — {laboratoryLabel(laboratory)} will be notified.
                </span>
              ) : (
                `${Object.keys(errors).length} required field${Object.keys(errors).length === 1 ? '' : 's'} remaining`
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={UserPlus}>
                Register visitor
              </Button>
            </div>
          </div>
        </div>
      </form>
    </DashboardPage>
  );
};
