import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertPlayerCharacterSchema, type InsertPlayerCharacter, type PlayerCharacter } from '@shared/schema';
import { UserPlus, Edit, Trash2, Shield, Sword, Heart, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CharacterManagerProps {
  sessionId: string | null;
  userId: string;
}

export function CharacterManager({ sessionId, userId }: CharacterManagerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<PlayerCharacter | null>(null);

  const characterSchema = insertPlayerCharacterSchema;

  const form = useForm({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      userId,
      sessionId: sessionId ?? null,
      name: '',
      characterClass: '',
      level: 1,
      background: '',
      stats: null,
      skills: null,
      equipment: null,
      notes: '',
      isActive: 'true'
    }
  });

  // Query user characters
  const { data: characters = [], isLoading: charactersLoading } = useQuery<PlayerCharacter[]>({
    queryKey: ['/api/users', userId, 'characters'],
    enabled: !!userId
  });

  // Create character mutation
  const createCharacterMutation = useMutation({
    mutationFn: async (data: InsertPlayerCharacter) => {
      const response = await apiRequest('POST', '/api/characters', data);
      return response.json();
    },
    onSuccess: (character: PlayerCharacter) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'characters'] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'characters'] });
      }
      setIsDialogOpen(false);
      setEditingCharacter(null);
      form.reset();
      toast({
        title: t('characterManager.characterCreated'),
        description: t('characterManager.characterCreatedDesc', { name: character.name }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('characterManager.creationFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Update character mutation
  const updateCharacterMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PlayerCharacter>) => {
      const response = await apiRequest('PATCH', `/api/characters/${id}`, data);
      return response.json();
    },
    onSuccess: (character: PlayerCharacter) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'characters'] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'characters'] });
      }
      setIsDialogOpen(false);
      setEditingCharacter(null);
      form.reset();
      toast({
        title: t('characterManager.characterUpdated'),
        description: t('characterManager.characterUpdatedDesc', { name: character.name }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('characterManager.updateFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete character mutation
  const deleteCharacterMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/characters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'characters'] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'characters'] });
      }
      toast({
        title: t('characterManager.characterDeleted'),
        description: t('characterManager.characterDeletedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('characterManager.deletionFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleEditCharacter = (character: PlayerCharacter) => {
    setEditingCharacter(character);
    form.reset({
      userId: character.userId ?? userId,
      sessionId: character.sessionId,
      name: character.name,
      characterClass: character.characterClass,
      level: character.level ?? 1,
      background: character.background ?? '',
      stats: character.stats,
      skills: character.skills,
      equipment: character.equipment,
      notes: character.notes ?? '',
      isActive: character.isActive ?? 'true'
    });
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingCharacter(null);
    form.reset({
      userId,
      sessionId: sessionId ?? null,
      name: '',
      characterClass: '',
      level: 1,
      background: '',
      stats: null,
      skills: null,
      equipment: null,
      notes: '',
      isActive: 'true'
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingCharacter) {
      updateCharacterMutation.mutate({ id: editingCharacter.id, ...data });
    } else {
      createCharacterMutation.mutate(data);
    }
  };

  const getClassIcon = (characterClass: string) => {
    if (characterClass.toLowerCase().includes('warrior') || characterClass.toLowerCase().includes('guerrier')) {
      return <Sword className="h-4 w-4 text-rust-400" />;
    }
    if (characterClass.toLowerCase().includes('medic') || characterClass.toLowerCase().includes('médecin')) {
      return <Heart className="h-4 w-4 text-green-400" />;
    }
    if (characterClass.toLowerCase().includes('leader') || characterClass.toLowerCase().includes('chef')) {
      return <Shield className="h-4 w-4 text-brass-400" />;
    }
    return <UserPlus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="metal-panel rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rust-400">{t('characterManager.title')}</h2>
        <Button 
          onClick={handleCreateNew}
          size="sm"
          className="industrial-button"
          data-testid="button-create-character"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('characterManager.createNew')}
        </Button>
      </div>

      {charactersLoading ? (
        <div className="text-center text-gray-400 py-4">
          <div className="animate-spin h-6 w-6 border-2 border-rust-400 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('characterManager.noCharacters')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('characterManager.createFirstCharacter')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {characters.map((character) => (
            <Card key={character.id} className="bg-steel-700 border-steel-600" data-testid={`character-card-${character.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brass-400 rounded-full flex items-center justify-center">
                      {getClassIcon(character.characterClass)}
                    </div>
                    <div>
                      <CardTitle className="text-sm text-white">{character.name}</CardTitle>
                      <p className="text-xs text-gray-400">
                        {character.characterClass} - {t('characterManager.level')} {character.level}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleEditCharacter(character)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white p-1"
                      data-testid={`button-edit-character-${character.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteCharacterMutation.mutate(character.id)}
                      disabled={deleteCharacterMutation.isPending}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-400 p-1"
                      data-testid={`button-delete-character-${character.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {character.background && (
                  <p className="text-xs text-gray-300 mb-2">{character.background}</p>
                )}
                {character.notes && (
                  <p className="text-xs text-gray-400">{character.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-steel-800 border-steel-600">
          <DialogHeader>
            <DialogTitle className="text-rust-400">
              {editingCharacter ? t('characterManager.editCharacter') : t('characterManager.createCharacter')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingCharacter ? t('characterManager.editCharacterDesc') : t('characterManager.createCharacterDesc')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('characterManager.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-steel-700 border-steel-600 text-white"
                          placeholder={t('characterManager.namePlaceholder')}
                          data-testid="input-character-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="characterClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('characterManager.class')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-character-class">
                        <FormControl>
                          <SelectTrigger className="bg-steel-700 border-steel-600 text-white">
                            <SelectValue placeholder={t('characterManager.selectClass')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-steel-700 border-steel-600">
                          <SelectItem value="Guerrier des Terres Vides">{t('characterManager.classes.wastelandWarrior')}</SelectItem>
                          <SelectItem value="Médecin de Route">{t('characterManager.classes.roadMedic')}</SelectItem>
                          <SelectItem value="Marchand Nomade">{t('characterManager.classes.nomadTrader')}</SelectItem>
                          <SelectItem value="Technicien des Ruines">{t('characterManager.classes.ruinsTech')}</SelectItem>
                          <SelectItem value="Chef de Caravane">{t('characterManager.classes.caravanLeader')}</SelectItem>
                          <SelectItem value="Éclaireur">{t('characterManager.classes.scout')}</SelectItem>
                          <SelectItem value="Artificier">{t('characterManager.classes.artificer')}</SelectItem>
                          <SelectItem value="Diplomate">{t('characterManager.classes.diplomat')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('characterManager.level')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="20"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="bg-steel-700 border-steel-600 text-white"
                        data-testid="input-character-level"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="background"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('characterManager.background')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        className="bg-steel-700 border-steel-600 text-white resize-none"
                        placeholder={t('characterManager.backgroundPlaceholder')}
                        rows={3}
                        data-testid="textarea-character-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('characterManager.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        className="bg-steel-700 border-steel-600 text-white resize-none"
                        placeholder={t('characterManager.notesPlaceholder')}
                        rows={2}
                        data-testid="textarea-character-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="border-steel-600 text-gray-300 hover:bg-steel-700"
                  data-testid="button-cancel-character"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCharacterMutation.isPending || updateCharacterMutation.isPending}
                  className="industrial-button"
                  data-testid="button-save-character"
                >
                  {createCharacterMutation.isPending || updateCharacterMutation.isPending 
                    ? t('common.saving') 
                    : (editingCharacter ? t('common.update') : t('common.create'))
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}