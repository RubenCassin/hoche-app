const express = require('express');
const router = express.Router();
const { prisma, userToPublic, jarr, jstr } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { addNotification } = require('../notify');

async function shape(post, me) {
  const [author, commentCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: post.userId } }),
    prisma.comment.count({ where: { postId: post.id } }),
  ]);
  const likes = jarr(post.likes);
  return {
    id: post.id,
    user_id: post.userId,
    userName: author ? author.name : 'Joueur',
    username: author ? author.username : '',
    text: post.text,
    created_at: post.createdAt.toISOString(),
    likeCount: likes.length,
    liked: likes.indexOf(me) >= 0,
    commentCount,
  };
}

// POST /posts { text }
router.post('/', requireAuth, async function (req, res, next) {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Message vide' });
    if (text.length > 280) return res.status(400).json({ error: '280 caractères max' });

    const post = await prisma.post.create({ data: { userId: req.userId, text } });
    res.status(201).json({
      id: post.id,
      user_id: post.userId,
      text: post.text,
      created_at: post.createdAt.toISOString(),
      likes: [],
    });
  } catch (e) { next(e); }
});

// GET /posts/:id — single post (shaped for the thread screen)
router.get('/:id', requireAuth, async function (req, res, next) {
  try {
    const post = await prisma.post.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!post) return res.status(404).json({ error: 'Post introuvable' });
    res.json(await shape(post, req.userId));
  } catch (e) { next(e); }
});

// POST /posts/:id/like — toggle like (notifies author on like)
router.post('/:id/like', requireAuth, async function (req, res, next) {
  try {
    const post = await prisma.post.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!post) return res.status(404).json({ error: 'Post introuvable' });

    const likes = jarr(post.likes);
    const i = likes.indexOf(req.userId);
    const liked = i < 0;
    if (liked) likes.push(req.userId);
    else likes.splice(i, 1);

    await prisma.post.update({ where: { id: post.id }, data: { likes: jstr(likes) } });
    if (liked) await addNotification(post.userId, 'like', req.userId, { postId: post.id });
    res.json({ liked, likeCount: likes.length });
  } catch (e) { next(e); }
});

// GET /posts/:id/comments — oldest → newest, with author info
router.get('/:id/comments', requireAuth, async function (req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const rows = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
    res.json(
      rows.map(function (c) {
        return {
          id: c.id,
          user_id: c.userId,
          userName: c.user ? c.user.name : 'Joueur',
          username: c.user ? c.user.username : '',
          text: c.text,
          created_at: c.createdAt.toISOString(),
        };
      })
    );
  } catch (e) { next(e); }
});

// POST /posts/:id/comment { text } (notifies author)
router.post('/:id/comment', requireAuth, async function (req, res, next) {
  try {
    const post = await prisma.post.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!post) return res.status(404).json({ error: 'Post introuvable' });
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Commentaire vide' });
    if (text.length > 280) return res.status(400).json({ error: '280 caractères max' });

    const comment = await prisma.comment.create({
      data: { postId: post.id, userId: req.userId, text },
    });
    await addNotification(post.userId, 'comment', req.userId, { postId: post.id });

    const author = await prisma.user.findUnique({ where: { id: req.userId } });
    res.status(201).json(
      Object.assign(userToPublic(author), {
        comment: {
          id: comment.id,
          post_id: comment.postId,
          user_id: comment.userId,
          text: comment.text,
          created_at: comment.createdAt.toISOString(),
        },
      })
    );
  } catch (e) { next(e); }
});

module.exports = router;
