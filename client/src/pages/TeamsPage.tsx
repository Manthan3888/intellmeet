import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Team, Project, Task } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const columns = [
  { id: 'todo', label: 'To Do', color: 'border-slate-600' },
  { id: 'in-progress', label: 'In Progress', color: 'border-amber-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500' },
] as const;

export function TeamsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [showNewTeam, setShowNewTeam] = useState(false);

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api<{ teams: Team[] }>('/api/teams', { token: accessToken }),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', selectedTeam],
    queryFn: () => api<{ projects: Project[] }>(`/api/teams/${selectedTeam}/projects`, { token: accessToken }),
    enabled: !!selectedTeam,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', selectedProject],
    queryFn: () => api<{ tasks: Task[] }>(`/api/teams/projects/${selectedProject}/tasks`, { token: accessToken }),
    enabled: !!selectedProject,
  });

  const createTeam = useMutation({
    mutationFn: () => api('/api/teams', { method: 'POST', token: accessToken, body: JSON.stringify({ name: newTeamName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setNewTeamName('');
      setShowNewTeam(false);
    },
  });

  const createProject = useMutation({
    mutationFn: () =>
      api(`/api/teams/${selectedTeam}/projects`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ name: newProjectName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', selectedTeam] });
      setNewProjectName('');
    },
  });

  const createTask = useMutation({
    mutationFn: (status: string) =>
      api(`/api/teams/projects/${selectedProject}/tasks`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ title: newTaskTitle, status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject] });
      setNewTaskTitle('');
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api(`/api/teams/tasks/${taskId}`, { method: 'PATCH', token: accessToken, body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject] }),
  });

  const addMember = useMutation({
    mutationFn: () =>
      api(`/api/teams/${selectedTeam}/members`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ email: memberEmail }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setMemberEmail('');
    },
  });

  const tasks = tasksData?.tasks || [];

  useEffect(() => {
    if (!selectedProject || !accessToken) return;
    const socket: Socket = io(SOCKET_URL, { auth: { token: accessToken } });
    socket.emit('join-project', { projectId: selectedProject });
    socket.on('task-updated', () => queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject] }));
    return () => {
      socket.disconnect();
    };
  }, [selectedProject, accessToken, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams & Projects</h1>
          <p className="text-slate-400">Manage workspaces and Kanban task boards.</p>
        </div>
        <Button onClick={() => setShowNewTeam(true)}>
          <Plus className="h-4 w-4" /> New Team
        </Button>
      </div>

      {showNewTeam && (
        <Card>
          <div className="flex gap-3">
            <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name" />
            <Button onClick={() => newTeamName && createTeam.mutate()}>Create</Button>
            <Button variant="ghost" onClick={() => setShowNewTeam(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader title="Teams" />
          <div className="space-y-1">
            {teamsData?.teams.map((team) => (
              <button
                key={team._id}
                onClick={() => { setSelectedTeam(team._id); setSelectedProject(null); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                  selectedTeam === team._id ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'
                )}
              >
                <Users className="h-4 w-4" />
                {team.name}
              </button>
            ))}
            {!teamsData?.teams.length && <p className="text-sm text-slate-500">Create a team to get started.</p>}
          </div>
        </Card>

        {selectedTeam && (
          <Card className="lg:col-span-1">
            <CardHeader title="Projects" />
            <div className="mb-3 flex gap-2">
              <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" className="text-sm" />
              <Button size="sm" onClick={() => newProjectName && createProject.mutate()}>+</Button>
            </div>
            <div className="space-y-1">
              {projectsData?.projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => setSelectedProject(p._id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                    selectedProject === p._id ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {p.name}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-2 text-xs text-slate-500">Invite member by email</p>
              <div className="flex gap-2">
                <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="email@..." className="text-sm" />
                <Button size="sm" variant="secondary" onClick={() => memberEmail && addMember.mutate()}>Add</Button>
              </div>
            </div>
          </Card>
        )}

        {selectedProject && (
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="New task title..." />
              <Button onClick={() => newTaskTitle && createTask.mutate('todo')}>Add Task</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {columns.map((col) => (
                <div key={col.id} className={cn('rounded-xl border-t-4 bg-slate-900/50 p-3', col.color)}>
                  <h3 className="mb-3 text-sm font-semibold text-white">{col.label}</h3>
                  <div className="space-y-2">
                    {tasks.filter((t) => t.status === col.id).map((task) => (
                      <div key={task._id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                        <p className="text-sm text-white">{task.title}</p>
                        {task.assigneeName && <p className="text-xs text-slate-500 mt-1">{task.assigneeName}</p>}
                        <div className="mt-2 flex gap-1">
                          {columns.filter((c) => c.id !== task.status).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => updateTask.mutate({ taskId: task._id, status: c.id })}
                              className="rounded px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 hover:text-white"
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
