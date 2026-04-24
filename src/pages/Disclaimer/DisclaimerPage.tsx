import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Shield, Info, Lock } from 'lucide-react';

interface DisclaimerPageProps {
  onBack: () => void;
}

export const DisclaimerPage = ({ onBack }: DisclaimerPageProps) => {
  return (
    <div className="h-full bg-background text-foreground p-6 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between"
        >
          <Button variant="ghost" onClick={onBack} className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="w-6 h-6" />
            <h1 className="text-4xl font-black tracking-tighter uppercase">Disclaimer & Policy</h1>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Info className="w-5 h-5 text-primary" />
              <h2>1. Non-Profit Status</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Isekaichat (the "App") is a non-commercial, fan-driven project created for entertainment and educational purposes only. The developer(s) do not generate revenue, sell subscriptions, or charge fees for the use of this service. No profit is being made from the creation, interaction, or display of characters within this App.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Shield className="w-5 h-5 text-primary" />
              <h2>2. Intellectual Property Rights</h2>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The App allows users to connect and interact with characters. Many of these characters may be based on existing anime, manga, light novels, games, or other media ("Existing IP").
              </p>
              <p>
                <strong>Ownership:</strong> All rights, titles, and interests in any copyrighted characters, names, or settings belong to their respective original creators and copyright holders.
              </p>
              <p>
                <strong>No Affiliation:</strong> This App is not affiliated with, endorsed by, or sponsored by any official studio, publisher, or creator of the Existing IP.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Lock className="w-5 h-5 text-primary" />
              <h2>3. Content & Responsibility</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Users are solely responsible for the characters they connect and the content of their chats. By using the App, users acknowledge that they are interacting with AI-generated simulations.
            </p>
          </section>
        </motion.div>

        <div className="pt-12 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} IsekAIChat Dimensional Link. All rights reserved to original IP holders.
        </div>
      </div>
    </div>
  );
};
