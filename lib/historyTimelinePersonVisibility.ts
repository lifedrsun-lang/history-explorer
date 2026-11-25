import type { TimelinePersonIndex,TimelinePersonCard } from "./historyTimelinePeople";
/** Remove links to events and topics hidden by the learner's display choices. No person source dataset is bundled. */
export function restrictPersonDirectoryToVisible(index:TimelinePersonIndex,events:{id:string}[],topics:{id:string}[]):TimelinePersonIndex {
  const eventIds=new Set(events.map(e=>e.id));
  const topicIds=new Set(topics.map(t=>t.id));
  const trim=(person:TimelinePersonCard):TimelinePersonCard=>({...person,
    related:person.related.filter(e=>eventIds.has(e.eventId)),
    topics:person.topics.filter(t=>topicIds.has(t.id)),
  });
  return {
    byEvent:Object.fromEntries(Object.entries(index.byEvent).filter(([id])=>eventIds.has(id)).map(([id,cards])=>[id,cards.map(trim)])),
    byTopic:Object.fromEntries(Object.entries(index.byTopic).filter(([id])=>topicIds.has(id)).map(([id,cards])=>[id,cards.map(trim)])),
  };
}
