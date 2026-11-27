'use strict';
const messages = Object.freeze({
  membership_active: ['Membership activated','Your Culinary Academy membership is active. Visit your account to explore your available learning materials.'],
  membership_cancelled: ['Membership cancellation recorded','Your cancellation has been recorded. Visit your account to check your access and billing details.'],
  payment_failed: ['Membership payment update','A membership payment could not be completed. Sign in to review your billing details.'],
  practical_reviewed: ['Practical assessment reviewed','Your practical assessment has been reviewed. Sign in to view your feedback and next steps.'],
  certificate_issued: ['Your certificate is available','Your Culinary Academy internal certificate is available in your account.']
});
function renderNotification(kind, origin) {
  if (!Object.hasOwn(messages,kind)) throw new Error('Unknown notification type');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid site origin');
  const [title,body] = messages[kind];
  const link = url.origin + '/membership.html';
  return Object.freeze({
    subject: 'Culinary Academy | ' + title,
    text: 'CULINARY ACADEMY\n\n'+title+'\n'+body+'\n\nVisit your account: '+link+'\n\nNever share your password.',
    html: '<!doctype html><html lang="en"><body style="margin:0;background:#f7f5ef;color:#182c24;font:16px Arial,sans-serif"><main style="max-width:560px;margin:auto;background:white"><header style="padding:24px;background:#214b39;color:white"><strong>CULINARY ACADEMY</strong><br>LEARN · DEVELOP · ACHIEVE</header><section style="padding:24px;line-height:1.6"><h1>'+title+'</h1><p>'+body+'</p><p><a style="display:inline-block;padding:14px 20px;background:#214b39;color:white" href="'+link+'">Visit your account</a></p><p>Never share your password.</p></section></main></body></html>'
  });
}
module.exports = {renderNotification};
