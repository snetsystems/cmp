package multistore

import (
	"context"

	cloudhub "github.com/snetsystems/cloudhub/backend"
)

// Protoboards is a ProtoboardsStore that contains multiple ProtoboardsStores
// The All method will return the set of all Protoboards.
// Each method will be tried against the Stores slice serially.
type Protoboards struct {
	Stores []cloudhub.ProtoboardsStore
}

// All returns the set of all protoboards
func (s *Protoboards) All(ctx context.Context) ([]cloudhub.Protoboard, error) {
	all := []cloudhub.Protoboard{}
	protoboardSet := map[string]cloudhub.Protoboard{}
	ok := false
	var err error
	for _, store := range s.Stores {
		var protoboards []cloudhub.Protoboard
		protoboards, err = store.All(ctx)
		if err != nil {
			// Try to load as many protoboards as possible
			continue
		}
		ok = true
		for _, l := range protoboards {
			// Enforce that the protoboard has a unique ID
			// If the protoboard has been seen before then skip
			if _, okay := protoboardSet[l.ID]; !okay {
				protoboardSet[l.ID] = l
				all = append(all, l)
			}
		}
	}
	if !ok {
		return nil, err
	}
	return all, nil
}

// Get retrieves protoboard if `ID` exists.  Searches through each store sequentially until success.
func (s *Protoboards) Get(ctx context.Context, ID string) (cloudhub.Protoboard, error) {
	var err error
	for _, store := range s.Stores {
		var l cloudhub.Protoboard
		l, err = store.Get(ctx, ID)
		if err == nil {
			return l, nil
		}
	}
	return cloudhub.Protoboard{}, err
}
