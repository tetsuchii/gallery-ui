import {
  formatDateLong,
  formatGroupShort,
  chronologicalBlocks,
  groupByDate,
} from "../data/dates.js";

function Photo({ item, onOpen, onSave, savedCount, compact, dateInHeader }) {
  const showCaption = !compact && (!dateInHeader || item.note);

  return (
    <figure className="photo">
      <div className="photo-frame">
        <button
          type="button"
          className="photo-button"
          onClick={() => onOpen(item)}
          aria-label={`Open photo from ${formatDateLong(item)}`}
        >
          <img src={item.src} alt="" loading="lazy" />
        </button>
      </div>

      {showCaption && (
        <figcaption className="photo-note">
          {!dateInHeader && (
            <span className="photo-date">{formatDateLong(item)}</span>
          )}
          {item.note && <span className="photo-note-text">{item.note}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function DayHeader({ group, compact }) {
  return (
    <div>
     
    </div>
  );
}

function Collection({ collection, monthLabel, onOpen, onSave, savedCounts, onOpenAlbum }) {
  const hasItems = collection.items.length > 0;
  const groups = groupByDate(collection.items);
  const albumId = `col::${collection.key}`;

  return (
    <section className="collection" aria-label={collection.name}>
      <header
        className={`collection-head${onOpenAlbum ? " collection-head--link" : ""}`}
        onClick={onOpenAlbum ? () => onOpenAlbum(albumId) : undefined}
      >
        <h3 className="collection-title">{collection.name}</h3>
        <span className="collection-meta">
          {hasItems
            ? `${collection.items.length} ${collection.items.length === 1 ? "photo" : "photos"}`
            : "Note"}
          {" · "}
          {monthLabel}
        </span>
        {collection.note && <p className="collection-note">{collection.note}</p>}
      </header>

      {hasItems && groups.map((g) => {
        const groupHeaderShown = g.items.length > 1 && g.day != null;
        return (
          <div key={g.key} className="collection-day">
            {groupHeaderShown && <DayHeader group={g} compact />}
            <div className="collection-grid">
              {g.items.map((item) => (
                <Photo
                  key={item.id}
                  item={item}
                  onOpen={onOpen}
                  onSave={onSave}
                  savedCount={savedCounts.get(item.id) || 0}
                  compact
                  dateInHeader={groupHeaderShown}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function LooseGroup({ group, onOpen, onSave, savedCounts }) {
  const groupHeaderShown = group.items.length > 1 && group.day != null;
  if (!groupHeaderShown) {
    const item = group.items[0];
    return (
      <Photo
        item={item}
        onOpen={onOpen}
        onSave={onSave}
        savedCount={savedCounts.get(item.id) || 0}
      />
    );
  }
  return (
    <div className="date-group">
      <DayHeader group={group} />
      {group.items.map((item) => (
        <Photo
          key={item.id}
          item={item}
          onOpen={onOpen}
          onSave={onSave}
          savedCount={savedCounts.get(item.id) || 0}
          dateInHeader
        />
      ))}
    </div>
  );
}

export default function Timeline({ months, onOpen, onSave, savedCounts, newestFirst, onOpenAlbum }) {  if (!months.length) {
    return (
      <div className="empty-state">
        <p>Nothing here for that filter.</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {months.map((m) => {
        const blocks = chronologicalBlocks(m, { newestFirst });
        return (
          <section key={m.key} className="month" id={`month-${m.key}`}>
            <header className="month-head">
              <h2 className="month-title">{m.label}</h2>
              <span className="month-rule" aria-hidden="true" />
            </header>

            <div className="month-stream">
              {blocks.map((b) =>
                b.kind === "collection" ? (
                  <Collection
                    key={b.collection.key}
                    collection={b.collection}
                    monthLabel={m.label}
                    onOpen={onOpen}
                    onSave={onSave}
                    savedCounts={savedCounts}
                    onOpenAlbum={onOpenAlbum}
                  />
                ) : (
                  <LooseGroup
                    key={b.group.key}
                    group={b.group}
                    onOpen={onOpen}
                    onSave={onSave}
                    
                    savedCounts={savedCounts}
                  />
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export { DayHeader, Photo };
