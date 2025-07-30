export default function listenerSorter<L extends {
    alwaysFirst: boolean;
    alwaysLast: boolean;
    index: number;
}>(l1: L, l2: L): -1 | 0 | 1;
