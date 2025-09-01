import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertSessionPlayerSchema, type InsertSessionPlayer, type SessionPlayer, type PlayerCharacter } from '@shared/schema';
import { Users, UserPlus, Crown, Eye, Settings, Trash2, Plus, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlayerManagerProps {
  sessionId: string;
  userId: string;
}

export function PlayerManager({ sessionId, userId }: PlayerManagerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sessionPlayerSchema = insertSessionPlayerSchema;

  const form = useForm({
    resolver: zodResolver(sessionPlayerSchema),
    defaultValues: {
      sessionId,
      userId: '',
      characterId: null,
      role: 'player',
      permissions: null,
      isOnline: 'false'
    }
  });

  // Query session players
  const { data: players = [], isLoading: playersLoading } = useQuery<SessionPlayer[]>({
    queryKey: ['/api/sessions', sessionId, 'players'],
    enabled: !!sessionId
  });

  // Query user characters for character selection
  const { data: characters = [] } = useQuery<PlayerCharacter[]>({
    queryKey: ['/api/users', userId, 'characters'],
    enabled: !!userId
  });

  // Add player to session mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (data: InsertSessionPlayer) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/players`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'players'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: t('playerManager.playerAdded'),
        description: t('playerManager.playerAddedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('playerManager.addFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Update player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<SessionPlayer>) => {
      const response = await apiRequest('PATCH', `/api/session-players/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'players'] });
      toast({
        title: t('playerManager.playerUpdated'),
        description: t('playerManager.playerUpdatedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('playerManager.updateFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Remove player from session mutation
  const removePlayerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/session-players/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'players'] });
      toast({
        title: t('playerManager.playerRemoved'),
        description: t('playerManager.playerRemovedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('playerManager.removeFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: any) => {
    addPlayerMutation.mutate(data);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'co_gm') return <Crown className="h-4 w-4 text-brass-400" />;
    if (role === 'observer') return <Eye className="h-4 w-4 text-gray-400" />;
    return <Users className="h-4 w-4 text-blue-400" />;
  };

  const getRoleBadge = (role: string) => {
    const variant = role === 'co_gm' ? 'secondary' : role === 'observer' ? 'outline' : 'default';
    return (
      <Badge variant={variant} className="text-xs">
        {t(`playerManager.roles.${role}`)}
      </Badge>
    );
  };

  const togglePlayerOnlineStatus = (player: SessionPlayer) => {
    const newStatus = player.isOnline === 'true' ? 'false' : 'true';
    updatePlayerMutation.mutate({
      id: player.id,
      isOnline: newStatus
    });
  };

  return (
    <div className="metal-panel rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rust-400">{t('playerManager.title')}</h2>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          size="sm"
          className="industrial-button"
          data-testid="button-add-player"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('playerManager.addPlayer')}
        </Button>
      </div>

      {playersLoading ? (
        <div className="text-center text-gray-400 py-4">
          <div className="animate-spin h-6 w-6 border-2 border-rust-400 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('playerManager.noPlayers')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('playerManager.addFirstPlayer')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <Card key={player.id} className="bg-steel-700 border-steel-600" data-testid={`player-card-${player.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brass-400 rounded-full flex items-center justify-center">
                      {getRoleIcon(player.role ?? 'player')}
                    </div>
                    <div>
                      <CardTitle className="text-sm text-white flex items-center space-x-2">
                        <span>{player.userId}</span>
                        {getRoleBadge(player.role ?? 'player')}
                        <button
                          onClick={() => togglePlayerOnlineStatus(player)}
                          className="ml-2 text-gray-400 hover:text-white"
                          data-testid={`button-toggle-online-${player.id}`}
                        >
                          {player.isOnline === 'true' ? (
                            <Wifi className="h-3 w-3 text-green-400" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </CardTitle>
                      <p className="text-xs text-gray-400">
                        {t('playerManager.joinedAt')}: {new Date(player.joinedAt ?? '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => removePlayerMutation.mutate(player.id)}
                      disabled={removePlayerMutation.isPending}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-400 p-1"
                      data-testid={`button-remove-player-${player.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {player.characterId && (
                  <div className="text-xs text-gray-300">
                    <span className="text-gray-400">{t('playerManager.character')}: </span>
                    {player.characterId}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {t('playerManager.lastActive')}: {player.lastActive ? new Date(player.lastActive).toLocaleString() : t('playerManager.never')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-steel-800 border-steel-600">
          <DialogHeader>
            <DialogTitle className="text-rust-400">{t('playerManager.addPlayerTitle')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('playerManager.addPlayerDesc')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('playerManager.playerId')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-steel-700 border-steel-600 text-white"
                        placeholder={t('playerManager.playerIdPlaceholder')}
                        data-testid="input-player-userid"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('playerManager.role')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? 'player'} data-testid="select-player-role">
                      <FormControl>
                        <SelectTrigger className="bg-steel-700 border-steel-600 text-white">
                          <SelectValue placeholder={t('playerManager.selectRole')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-steel-700 border-steel-600">
                        <SelectItem value="player">{t('playerManager.roles.player')}</SelectItem>
                        <SelectItem value="co_gm">{t('playerManager.roles.co_gm')}</SelectItem>
                        <SelectItem value="observer">{t('playerManager.roles.observer')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="characterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('playerManager.character')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? ''} data-testid="select-player-character">
                      <FormControl>
                        <SelectTrigger className="bg-steel-700 border-steel-600 text-white">
                          <SelectValue placeholder={t('playerManager.selectCharacter')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-steel-700 border-steel-600">
                        <SelectItem value="">{t('playerManager.noCharacter')}</SelectItem>
                        {characters.map((character: PlayerCharacter) => (
                          <SelectItem key={character.id} value={character.id}>
                            {character.name} ({character.characterClass})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  data-testid="button-cancel-player"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={addPlayerMutation.isPending}
                  className="industrial-button"
                  data-testid="button-add-player-submit"
                >
                  {addPlayerMutation.isPending ? t('common.adding') : t('common.add')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}