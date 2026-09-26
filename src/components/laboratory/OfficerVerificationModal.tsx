import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  CreditCard,
  BadgeCheck,
  FileCheck,
  X,
} from 'lucide-react';
import { OfficerVisitor, LaboratoryDepartment } from '../../types';

interface OfficerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitor: OfficerVisitor;
  currentAnalystName: string;
  onConfirmVerification: (data: {
    nationalId: string;
    badgeNumber: string;
    name: string;
    phone: string;
    station: string;
    date: string;
    time: string;
    receivingAnalyst: string;
    status: 'VERIFIED' | 'VERIFICATION REQUIRED';
    notes: string;
    proceedToIntake: boolean;
  }) => void;
}

export const OfficerVerificationModal: React.FC<OfficerVerificationModalProps> = ({
  isOpen,
  onClose,
  visitor,
  currentAnalystName,
  onConfirmVerification,
}) => {
  // Form fields for record/confirm
  const [officerName, setOfficerName] = useState(visitor.officerName);
  const [nationalId, setNationalId] = useState(visitor.nationalId);
  const [badgeNumber, setBadgeNumber] = useState(visitor.badgeNumber);
  const [phone, setPhone] = useState(visitor.phone);
  const [station, setStation] = useState(visitor.station);
  const [verificationDate, setVerificationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [verificationTime, setVerificationTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [receivingAnalyst, setReceivingAnalyst] = useState(currentAnalystName);
  const [verificationStatus, setVerificationStatus] = useState<
    'VERIFIED' | 'VERIFICATION REQUIRED'
  >('VERIFIED');
  const [notes, setNotes] = useState(
    'National Police Service Identification Card inspected. Service badge confirmed against station deployment roster. Physical exhibit seals verified intact in presence of officer.'
  );

  if (!isOpen) return null;

  const handleSubmit = (proceedToIntake: boolean) => {
    onConfirmVerification({
      nationalId,
      badgeNumber,
      name: officerName,
      phone,
      station,
      date: verificationDate,
      time: verificationTime,
      receivingAnalyst,
      status: verificationStatus,
      notes,
      proceedToIntake,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto dark:bg-slate-900 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 dark:text-white">
                <span>Officer Arrival &amp; Identity Verification</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  SECTION 8 PROTOCOL
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Departmental verification gate before formal submission intake and chain-of-custody transfer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Summary of Intake from Reception */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              Recorded by Reception ({visitor.receptionistName})
            </span>
            <span className="text-amber-400 font-mono text-[11px]">Time In: {visitor.timeIn}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Officer Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{visitor.officerName}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">National ID:</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">{visitor.nationalId}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Badge Number:</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">{visitor.badgeNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Phone Number:</span>
              <span className="text-slate-700 dark:text-slate-200">{visitor.phone}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Police Station:</span>
              <span className="text-slate-700 dark:text-slate-200">{visitor.station}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Target Laboratory:</span>
              <span className="text-amber-400 font-semibold">{visitor.laboratory}</span>
            </div>
          </div>
        </div>

        {/* Form to Record / Confirm Verification Details */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
          className="space-y-4 text-xs"
        >
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono text-amber-400 mb-3 dark:text-white">
              Confirm &amp; Record Receiving Verification Data
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Confirmed Officer Name</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">National ID Number</label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Service / Badge Number</label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Official Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Submitting Station / Unit</label>
                <input
                  type="text"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Receiving Analyst</label>
                <input
                  type="text"
                  value={receivingAnalyst}
                  onChange={(e) => setReceivingAnalyst(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Verification Date</label>
                <input
                  type="date"
                  value={verificationDate}
                  onChange={(e) => setVerificationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Verification Time</label>
                <input
                  type="text"
                  value={verificationTime}
                  onChange={(e) => setVerificationTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Verification Status Radio */}
            <div className="mt-4">
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">Verification Status</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="verificationStatus"
                    value="VERIFIED"
                    checked={verificationStatus === 'VERIFIED'}
                    onChange={() => setVerificationStatus('VERIFIED')}
                    className="accent-emerald-500"
                  />
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">VERIFIED</span>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    verificationStatus === 'VERIFICATION REQUIRED'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="verificationStatus"
                    value="VERIFICATION REQUIRED"
                    checked={verificationStatus === 'VERIFICATION REQUIRED'}
                    onChange={() => setVerificationStatus('VERIFICATION REQUIRED')}
                    className="accent-amber-500"
                  />
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">VERIFICATION REQUIRED</span>
                </label>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                Analyst Verification Remarks &amp; Physical Credentials Check
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-amber-400 outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Institutional Compliance Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 flex items-start gap-2.5 text-[11px] leading-relaxed dark:bg-slate-950 dark:border-slate-800 dark:text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Prototype System Notice:</strong> This internal verification confirms the physical National Police Service credentials and documents presented at the laboratory bay. The prototype operates on departmental chain-of-custody protocols without asserting a live connection to external civil registry databases.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs w-full sm:w-auto dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save Verification Record</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
              >
                <FileCheck className="w-4 h-4" />
                <span>Verify &amp; Proceed to Exhibit Intake →</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
