import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

// Rooms are named "project:<id>" so a task/comment update only reaches
// clients who are actually viewing that project's board — not every
// connected client.
const projectRoom = (projectId: string) => `project:${projectId}`;

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join-project', (projectId: string) => {
      if (!projectId) return;
      socket.join(projectRoom(projectId));
    });

    socket.on('leave-project', (projectId: string) => {
      if (!projectId) return;
      socket.leave(projectRoom(projectId));
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized — call initSocket(httpServer) first');
  }
  return io;
};

// Emit helpers used by taskController so route handlers don't need to know
// about room naming or the underlying io instance directly.

export const emitTaskCreated = (projectId: string, task: unknown) => {
  getIO().to(projectRoom(projectId)).emit('task:created', task);
};

export const emitTaskUpdated = (projectId: string, task: unknown) => {
  getIO().to(projectRoom(projectId)).emit('task:updated', task);
};

export const emitTaskCommentAdded = (projectId: string, task: unknown) => {
  getIO().to(projectRoom(projectId)).emit('task:comment', task);
};