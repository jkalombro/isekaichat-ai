import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, writeBatch, deleteDoc, query } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/shared/services/firebase';
import { harvestCharacterProfile } from '@/shared/services/gemini';
import { Character } from '@/shared/types';
import { isSmartMatch, capitalize } from '@/shared/utils';

import { CreateModal } from './modals/CreateModal';
import { ResetModal } from './modals/ResetModal';
import { DeleteModal } from './modals/DeleteModal';
import { MaintenanceModal } from './modals/MaintenanceModal';
import { ManualModal } from './modals/ManualModal';
import { ConnectionStatusModal } from './modals/ConnectionStatusModal';
import { ProcessingOverlay } from './modals/ProcessingOverlay';

interface ModalManagerProps {
  user: any;
  characters: Character[];
  selectedChar: Character | null;
  setSelectedChar: (char: Character | null) => void;
  selectedModel: string;
  isAdmin: boolean;
  isUploading: boolean;
  onModalStateChange: (states: any) => void;
}

export const ModalManager = ({
  user,
  characters,
  selectedChar,
  setSelectedChar,
  selectedModel,
  isAdmin,
  isUploading,
  onModalStateChange
}: ModalManagerProps) => {
  // Modal Visibility States
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConnectionStatusOpen, setIsConnectionStatusOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Form / Action States
  const [charName, setCharName] = useState('');
  const [charSource, setCharSource] = useState('');
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isResettingMemories, setIsResettingMemories] = useState(false);
  const [isSeveringLink, setIsSeveringLink] = useState(false);

  // Expose setters to ChatPage
  useEffect(() => {
    onModalStateChange({
      setIsCreating,
      setIsResetting,
      setIsDeleting,
      setIsConnectionStatusOpen,
      setIsMaintenanceModalOpen,
      setIsManualModalOpen
    });
  }, [onModalStateChange]);

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName || !charSource || !user) return;

    setIsHarvesting(true);
    try {
      const existingInLocal = characters.find(c => 
        isSmartMatch(c.name, c.source, charName, charSource)
      );

      if (existingInLocal) {
        setSelectedChar(existingInLocal);
        setCharName('');
        setCharSource('');
        setIsCreating(false);
        toast.info(`You already have a link with ${capitalize(existingInLocal.name)}.`);
        return;
      }

      const globalExistingSnapshot = await getDocs(collection(db, 'characters'));
      const globalChars = globalExistingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
      
      const globalMatch = globalChars.find(c => 
        isSmartMatch(c.name, c.source, charName, charSource) && 
        c.profile !== "CHARACTER_NOT_FOUND"
      );
      
      let profile: any;
      let existingAvatar: string | undefined;

      if (globalMatch) {
        profile = { text: globalMatch.profile, tokensConsumed: 0 };
        existingAvatar = globalMatch.avatarUrl;
        toast.info(`Existing dimensional frequency found for ${capitalize(globalMatch.name)}. Syncing data...`);
      } else {
        profile = await harvestCharacterProfile(charName, charSource, user.geminiKey, selectedModel);
      }

      if (!profile || !profile.text || profile.text.toUpperCase().includes("CHARACTER_NOT_FOUND")) {
        throw new Error("CHARACTER_NOT_FOUND");
      }

      const characterData: any = {
        name: (charName.length > (globalMatch?.name?.length || 0)) ? charName : (globalMatch?.name || charName),
        source: (charSource.length > (globalMatch?.source?.length || 0)) ? charSource : (globalMatch?.source || charSource),
        profile: profile.text,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        totalTokensConsumed: profile.tokensConsumed || 0,
        lastCalculationDatetime: serverTimestamp()
      };

      if (existingAvatar) {
        characterData.avatarUrl = existingAvatar;
      }

      await addDoc(collection(db, 'characters'), characterData);

      setCharName('');
      setCharSource('');
      setIsCreating(false);
      toast.success(`Connection established with ${capitalize(characterData.name)}!`);
    } catch (error: any) {
      console.error("Link Error:", error);
      if (error.message === "CHARACTER_NOT_FOUND") {
        toast.error(`Dimensional Rift Error: Could not find ${capitalize(charName)} in ${capitalize(charSource)}. Please verify the character exists.`);
      } else {
        toast.error("The rift is currently unstable. Maybe we try again in few minutes.");
      }
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleResetConversation = async () => {
    if (resetConfirm !== 'forget about me' || !selectedChar || !user) return;

    setIsResettingMemories(true);
    try {
      const q = query(collection(db, 'characters', selectedChar.id, 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      const charRef = doc(db, 'characters', selectedChar.id);
      batch.update(charRef, {
        memories: "",
        lastSummarizedIndex: 0
      });

      await batch.commit();
      setResetConfirm('');
      setIsResetting(false);
      toast.success("Dimensional memory wiped.");
    } catch (error: any) {
      toast.error("Failed to reset conversation.");
    } finally {
      setIsResettingMemories(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (deleteConfirm !== 'sever connection' || !selectedChar || !user) return;

    setIsSeveringLink(true);
    try {
      const q = query(collection(db, 'characters', selectedChar.id, 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      await deleteDoc(doc(db, 'characters', selectedChar.id));
      
      setDeleteConfirm('');
      setIsDeleting(false);
      setSelectedChar(null);
      toast.success("Dimensional link severed.");
    } catch (error: any) {
      toast.error("Failed to sever connection.");
    } finally {
      setIsSeveringLink(false);
    }
  };

  return (
    <>
      <CreateModal 
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        charName={charName}
        setCharName={setCharName}
        charSource={charSource}
        setCharSource={setCharSource}
        handleCreateCharacter={handleCreateCharacter}
        isHarvesting={isHarvesting}
      />

      <ResetModal 
        isResetting={isResetting}
        setIsResetting={setIsResetting}
        selectedChar={selectedChar}
        resetConfirm={resetConfirm}
        setResetConfirm={setResetConfirm}
        handleResetConversation={handleResetConversation}
      />

      <DeleteModal 
        isDeleting={isDeleting}
        setIsDeleting={setIsDeleting}
        selectedChar={selectedChar}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        handleDeleteConnection={handleDeleteConnection}
      />

      <MaintenanceModal 
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
      />

      <ManualModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      <ConnectionStatusModal 
        isOpen={isConnectionStatusOpen}
        onClose={() => setIsConnectionStatusOpen(false)}
        selectedChar={selectedChar}
        onOpenReset={() => setIsResetting(true)}
        onOpenSever={() => setIsDeleting(true)}
      />

      <ProcessingOverlay 
        isHarvesting={isHarvesting}
        isResettingMemories={isResettingMemories}
        isUploading={isUploading}
        isLoggingIn={false}
        isSeveringLink={isSeveringLink}
      />
    </>
  );
};
